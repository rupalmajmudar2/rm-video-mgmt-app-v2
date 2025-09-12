from sqlalchemy import Column, BigInteger, String, Text, DateTime, Integer, Enum, Boolean, JSON, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    USER = "USER"
    GUEST = "GUEST"


class MediaKind(str, enum.Enum):
    PHOTO = "PHOTO"
    VIDEO = "VIDEO"


class MediaSourceKind(str, enum.Enum):
    VIDEOTAPE = "VIDEOTAPE"
    ICLOUD = "ICLOUD"
    GOOGLE_PHOTOS = "GOOGLE_PHOTOS"
    GOOGLE_DRIVE = "GOOGLE_DRIVE"
    GUEST_UPLOAD = "GUEST_UPLOAD"
    USER_UPLOAD = "USER_UPLOAD"


class Visibility(str, enum.Enum):
    PRIVATE = "PRIVATE"
    LINK = "LINK"
    AUTHED = "AUTHED"


class Status(str, enum.Enum):
    READY = "READY"
    PROCESSING = "PROCESSING"
    FAILED = "FAILED"


class AssetType(str, enum.Enum):
    THUMBNAIL = "THUMBNAIL"
    PREVIEW = "PREVIEW"
    TRANSCODE = "TRANSCODE"
    SUBTITLE = "SUBTITLE"


class NotificationEventType(str, enum.Enum):
    USER_CREATED = "USER_CREATED"
    MEDIA_UPLOADED = "MEDIA_UPLOADED"
    COMMENT_ADDED = "COMMENT_ADDED"
    TAG_ADDED = "TAG_ADDED"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class ImportStatus(str, enum.Enum):
    PENDING = "PENDING"
    IMPORTED = "IMPORTED"
    SKIPPED_DUP = "SKIPPED_DUP"
    FAILED = "FAILED"


class MediaSource(Base):
    __tablename__ = "media_sources"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    kind = Column(Enum(MediaSourceKind), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())


class User(Base):
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.USER)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(32), nullable=True)
    name = Column(String(120), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_blocked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    uploaded_media = relationship("Media", back_populates="uploader")
    comments = relationship("Comment", back_populates="user")
    media_tags = relationship("MediaTag", back_populates="user")
    notifications = relationship("Notification", back_populates="recipient_user")
    audit_logs = relationship("AuditLog", back_populates="actor_user")


class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token_hash = Column(String(64), unique=True, nullable=False, index=True)
    user_agent = Column(String(255), nullable=True)
    ip = Column(String(45), nullable=True)  # IPv6 compatible
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="sessions")


class Media(Base):
    __tablename__ = "media"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    kind = Column(Enum(MediaKind), nullable=False)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    storage_path = Column(String(1024), nullable=False)
    filename = Column(String(255), nullable=False)
    ext = Column(String(16), nullable=False)
    byte_size = Column(BigInteger, nullable=False)
    content_hash = Column(String(64), unique=True, nullable=False, index=True)
    duration_sec = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    captured_at = Column(DateTime, nullable=True, index=True)
    uploaded_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    source_id = Column(BigInteger, ForeignKey("media_sources.id"), nullable=False)
    tape_number = Column(String(32), nullable=True, index=True)
    source_ref = Column(String(255), nullable=True)
    visibility = Column(Enum(Visibility), nullable=False, default=Visibility.AUTHED)
    status = Column(Enum(Status), nullable=False, default=Status.READY, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True, index=True)
    
    # Relationships
    uploader = relationship("User", back_populates="uploaded_media")
    source = relationship("MediaSource")
    comments = relationship("Comment", back_populates="media", cascade="all, delete-orphan")
    media_assets = relationship("MediaAsset", back_populates="media", cascade="all, delete-orphan")
    media_tags = relationship("MediaTag", back_populates="media", cascade="all, delete-orphan")
    imports = relationship("Import", back_populates="media")
    
    # Indexes
    __table_args__ = (
        Index("idx_media_source", "source_id"),
        Index("idx_media_captured_at", "captured_at"),
        Index("idx_media_status", "status"),
        Index("idx_media_deleted_at", "deleted_at"),
        Index("idx_media_tape_number", "tape_number"),
    )


class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())


class MediaTag(Base):
    __tablename__ = "media_tags"
    
    media_id = Column(BigInteger, ForeignKey("media.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(BigInteger, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    media = relationship("Media", back_populates="media_tags")
    tag = relationship("Tag")
    user = relationship("User", back_populates="media_tags")


class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    media_id = Column(BigInteger, ForeignKey("media.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    media = relationship("Media", back_populates="comments")
    user = relationship("User", back_populates="comments")


class MediaAsset(Base):
    __tablename__ = "media_assets"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    media_id = Column(BigInteger, ForeignKey("media.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(Enum(AssetType), nullable=False)
    storage_path = Column(String(1024), nullable=False)
    mime_type = Column(String(127), nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    duration_sec = Column(Integer, nullable=True)
    quality_label = Column(String(32), nullable=True)
    status = Column(Enum(Status), nullable=False, default=Status.READY)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    media = relationship("Media", back_populates="media_assets")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    recipient_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    event_type = Column(Enum(NotificationEventType), nullable=False)
    payload_json = Column(JSON, nullable=False)
    status = Column(Enum(NotificationStatus), nullable=False, default=NotificationStatus.PENDING)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    sent_at = Column(DateTime, nullable=True)
    error_msg = Column(String(255), nullable=True)
    
    # Relationships
    recipient_user = relationship("User", back_populates="notifications")


class Import(Base):
    __tablename__ = "imports"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    source = Column(Enum(MediaSourceKind), nullable=False)
    external_id = Column(String(255), nullable=True)
    media_id = Column(BigInteger, ForeignKey("media.id"), nullable=True)
    run_id = Column(String(64), nullable=False, index=True)
    status = Column(Enum(ImportStatus), nullable=False)
    message = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    media = relationship("Media", back_populates="imports")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    actor_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    action = Column(String(64), nullable=False)
    target_table = Column(String(64), nullable=False)
    target_id = Column(BigInteger, nullable=False)
    delta_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    actor_user = relationship("User", back_populates="audit_logs")
