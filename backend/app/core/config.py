from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Database
    database_url: str = "mysql+pymysql://root@localhost:3306/video_mgmt_db"
    
    # Security
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Media Storage
    media_storage_path: str = "/volume1/media"
    max_file_size_mb: int = 2048
    
    # Features
    enable_user_uploads: bool = False
    enable_guest_view: bool = False
    
    # Admin
    admin_email: str = "admin@example.com"
    admin_password: str = "admin123"
    
    # Allowed file extensions
    allowed_extensions: List[str] = [".mp4", ".mov", ".jpg", ".jpeg", ".png", ".heic", ".webp"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
