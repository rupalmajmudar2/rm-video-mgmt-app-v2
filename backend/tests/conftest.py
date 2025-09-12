import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, get_db
from app.models.database import *
from app.core.config import settings

# Test database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client():
    """Create a test client"""
    return TestClient(app)

@pytest.fixture(scope="function")
def admin_user(db_session):
    """Create an admin user for testing"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user = User(
        role="ADMIN",
        email="admin@test.com",
        name="Test Admin",
        password_hash=pwd_context.hash("testpass123"),
        is_blocked=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def regular_user(db_session):
    """Create a regular user for testing"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user = User(
        role="USER",
        email="user@test.com",
        name="Test User",
        password_hash=pwd_context.hash("testpass123"),
        is_blocked=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def media_sources(db_session):
    """Create media sources for testing"""
    sources = [
        MediaSource(kind="VIDEOTAPE", name="Video Tapes"),
        MediaSource(kind="ICLOUD", name="iCloud"),
        MediaSource(kind="GOOGLE_PHOTOS", name="Google Photos"),
        MediaSource(kind="USER_UPLOAD", name="User Uploads"),
    ]
    
    for source in sources:
        db_session.add(source)
    db_session.commit()
    
    return sources

@pytest.fixture(scope="function")
def videotape_source(db_session, media_sources):
    """Get VideoTape source"""
    return db_session.query(MediaSource).filter(MediaSource.kind == "VIDEOTAPE").first()

@pytest.fixture(scope="function")
def icloud_source(db_session, media_sources):
    """Get iCloud source"""
    return db_session.query(MediaSource).filter(MediaSource.kind == "ICLOUD").first()
