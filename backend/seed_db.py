#!/usr/bin/env python3
"""
Seed the database with initial data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from app.core.database import engine
from app.models.database import *
from app.core.config import settings
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_database():
    """Seed the database with initial data"""
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create media sources
        media_sources = [
            MediaSource(kind="VIDEOTAPE", name="Video Tapes"),
            MediaSource(kind="ICLOUD", name="iCloud"),
            MediaSource(kind="GOOGLE_PHOTOS", name="Google Photos"),
            MediaSource(kind="GOOGLE_DRIVE", name="Google Drive"),
            MediaSource(kind="GUEST_UPLOAD", name="Guest Uploads"),
            MediaSource(kind="USER_UPLOAD", name="User Uploads"),
        ]
        
        for source in media_sources:
            existing = db.query(MediaSource).filter(MediaSource.kind == source.kind).first()
            if not existing:
                db.add(source)
                print(f"Created media source: {source.name}")
        
        # Create admin user
        admin_user = db.query(User).filter(User.email == settings.admin_email).first()
        if not admin_user:
            admin_user = User(
                role="ADMIN",
                email=settings.admin_email,
                name="Admin User",
                password_hash=pwd_context.hash(settings.admin_password),
                is_blocked=False
            )
            db.add(admin_user)
            print(f"Created admin user: {settings.admin_email}")
        else:
            print(f"Admin user already exists: {settings.admin_email}")
        
        # Commit all changes
        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
