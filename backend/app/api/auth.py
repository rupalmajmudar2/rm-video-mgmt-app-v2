from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, validator

from ..core.database import get_db
from ..core.config import settings
from ..models.database import User, Session as UserSession
from ..services.auth_service import AuthService

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_blocked: bool
    created_at: datetime

    class Config:
        from_attributes = True


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token() -> str:
    """Create a random refresh token"""
    import secrets
    return secrets.token_urlsafe(32)


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if user is None or user.is_blocked:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user (requires admin approval)"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=hashed_password,
        role="USER"  # Default role, admin can change
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # TODO: Send notification to admin about new user
    
    return user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with email and password"""
    user = db.query(User).filter(User.email == form_data.username, User.deleted_at.is_(None)).first()
    
    if not user or not verify_password(form_data.password, user.password_hash) or user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    # Create refresh token
    refresh_token = create_refresh_token()
    refresh_token_hash = get_password_hash(refresh_token)
    
    # Store refresh token in database
    user_session = UserSession(
        user_id=user.id,
        refresh_token_hash=refresh_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(user_session)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(request: dict, db: Session = Depends(get_db)):
    refresh_token = request.get("refresh_token")
    """Refresh access token using refresh token"""
    # Find session by refresh token
    sessions = db.query(UserSession).filter(
        UserSession.expires_at > datetime.utcnow(),
        UserSession.revoked_at.is_(None)
    ).all()
    
    valid_session = None
    for session in sessions:
        if verify_password(refresh_token, session.refresh_token_hash):
            valid_session = session
            break
    
    if not valid_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user
    user = db.query(User).filter(User.id == valid_session.user_id).first()
    if not user or user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or blocked"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,  # Keep same refresh token
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(request: dict = None, db: Session = Depends(get_db)):
    """Logout by revoking refresh token"""
    if not request or "refresh_token" not in request:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required"
        )
    refresh_token = request.get("refresh_token")
    # Find and revoke session
    sessions = db.query(UserSession).filter(
        UserSession.expires_at > datetime.utcnow(),
        UserSession.revoked_at.is_(None)
    ).all()
    
    for session in sessions:
        if verify_password(refresh_token, session.refresh_token_hash):
            session.revoked_at = datetime.utcnow()
            db.commit()
            return {"message": "Successfully logged out"}
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid refresh token"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
