from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime
import hashlib
import os

from ..models.database import Media, MediaSource as MediaSourceModel, Tag, MediaTag, Comment
from ..models.media_source import MediaDTO, get_media_source


class MediaService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_media(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        tag_ids: Optional[List[int]] = None,
        source: Optional[str] = None,
        tape_number: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Media]:
        """Get media with filters"""
        query = self.db.query(Media).filter(Media.deleted_at.is_(None))
        
        # Date filters
        if date_from:
            query = query.filter(Media.captured_at >= date_from)
        if date_to:
            query = query.filter(Media.captured_at <= date_to)
        
        # Source filter
        if source:
            query = query.join(MediaSourceModel).filter(MediaSourceModel.kind == source)
        
        # Tape number filter (only for VideoTape source)
        if tape_number:
            query = query.filter(Media.tape_number == tape_number)
        
        # Tag filter
        if tag_ids:
            query = query.join(MediaTag).filter(MediaTag.tag_id.in_(tag_ids))
        
        return query.offset(skip).limit(limit).all()
    
    def get_media_by_id(self, media_id: int) -> Optional[Media]:
        """Get media by ID"""
        return self.db.query(Media).filter(
            Media.id == media_id,
            Media.deleted_at.is_(None)
        ).first()
    
    def create_media(self, media_dto: MediaDTO, uploaded_by: int) -> Media:
        """Create new media with validation"""
        # Get the appropriate source validator
        source_validator = get_media_source(media_dto.source_kind)
        
        # Normalize the DTO
        media_dto = source_validator.normalize(media_dto)
        
        # Validate according to source rules
        source_validator.validate(media_dto)
        
        # Get source from database
        source = self.db.query(MediaSourceModel).filter(
            MediaSourceModel.kind == media_dto.source_kind
        ).first()
        
        if not source:
            raise ValueError(f"Unknown source kind: {media_dto.source_kind}")
        
        # Check for duplicate content_hash (if we had file upload)
        # For now, we'll generate a placeholder hash
        content_hash = hashlib.sha256(f"{media_dto.source_kind}_{media_dto.source_ref}".encode()).hexdigest()
        
        # Check for duplicate tape_number if VideoTape
        if media_dto.source_kind == "VIDEOTAPE" and media_dto.tape_number:
            existing = self.db.query(Media).join(MediaSourceModel).filter(
                MediaSourceModel.kind == "VIDEOTAPE",
                Media.tape_number == media_dto.tape_number,
                Media.deleted_at.is_(None)
            ).first()
            if existing:
                raise ValueError(f"Tape number {media_dto.tape_number} already exists")
        
        # Create media record
        media = Media(
            kind=media_dto.kind,
            title=media_dto.title,
            description=media_dto.description,
            storage_path=f"/placeholder/path/{content_hash[:8]}",  # Placeholder
            filename=f"placeholder.{media_dto.kind.lower()}",
            ext=media_dto.kind.lower(),
            byte_size=0,  # Placeholder
            content_hash=content_hash,
            captured_at=datetime.fromisoformat(media_dto.captured_at) if media_dto.captured_at else None,
            uploaded_by=uploaded_by,
            source_id=source.id,
            tape_number=media_dto.tape_number,
            source_ref=media_dto.source_ref
        )
        
        self.db.add(media)
        self.db.flush()  # Get the ID
        
        # Create tags
        if media_dto.tags:
            self._create_tags_for_media(media.id, media_dto.tags, uploaded_by)
        
        self.db.commit()
        self.db.refresh(media)
        
        return media
    
    def _create_tags_for_media(self, media_id: int, tag_names: List[str], created_by: int):
        """Create tags and associate them with media"""
        for tag_name in tag_names:
            # Get or create tag
            tag = self.db.query(Tag).filter(Tag.name == tag_name.lower()).first()
            if not tag:
                tag = Tag(name=tag_name.lower())
                self.db.add(tag)
                self.db.flush()
            
            # Create media-tag association
            media_tag = MediaTag(
                media_id=media_id,
                tag_id=tag.id,
                created_by=created_by
            )
            self.db.add(media_tag)
    
    def add_tag_to_media(self, media_id: int, tag_name: str, created_by: int):
        """Add a tag to media"""
        media = self.get_media_by_id(media_id)
        if not media:
            raise ValueError("Media not found")
        
        # Get or create tag
        tag = self.db.query(Tag).filter(Tag.name == tag_name.lower()).first()
        if not tag:
            tag = Tag(name=tag_name.lower())
            self.db.add(tag)
            self.db.flush()
        
        # Check if association already exists
        existing = self.db.query(MediaTag).filter(
            MediaTag.media_id == media_id,
            MediaTag.tag_id == tag.id
        ).first()
        
        if existing:
            raise ValueError("Tag already associated with media")
        
        # Create association
        media_tag = MediaTag(
            media_id=media_id,
            tag_id=tag.id,
            created_by=created_by
        )
        self.db.add(media_tag)
        self.db.commit()
    
    def remove_tag_from_media(self, media_id: int, tag_id: int, user_id: int):
        """Remove a tag from media"""
        # Check if user can remove this tag (own or admin)
        media_tag = self.db.query(MediaTag).filter(
            MediaTag.media_id == media_id,
            MediaTag.tag_id == tag_id
        ).first()
        
        if not media_tag:
            raise ValueError("Tag not found on media")
        
        # Check permissions (simplified - in real app, check user role)
        if media_tag.created_by != user_id:
            # Check if user is admin
            from ..models.database import User
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or user.role != "ADMIN":
                raise ValueError("Not authorized to remove this tag")
        
        self.db.delete(media_tag)
        self.db.commit()
    
    def add_comment_to_media(self, media_id: int, body: str, user_id: int) -> Comment:
        """Add a comment to media"""
        media = self.get_media_by_id(media_id)
        if not media:
            raise ValueError("Media not found")
        
        comment = Comment(
            media_id=media_id,
            user_id=user_id,
            body=body
        )
        
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        
        return comment
    
    def get_media_comments(self, media_id: int) -> List[Comment]:
        """Get comments for media"""
        return self.db.query(Comment).filter(
            Comment.media_id == media_id,
            Comment.deleted_at.is_(None)
        ).order_by(Comment.created_at.desc()).all()
