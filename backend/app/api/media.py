from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import os
import uuid
import mimetypes
import hashlib

from ..core.database import get_db
from ..models.database import User, Media, MediaSource as MediaSourceModel, Tag, MediaTag, Comment
from ..models.media_source import MediaDTO, get_media_source
from ..services.media_service import MediaService
from .auth import get_current_user

router = APIRouter()


class MediaCreate(BaseModel):
    kind: str  # PHOTO, VIDEO
    title: Optional[str] = None
    description: Optional[str] = None
    captured_at: Optional[datetime] = None
    tags: List[str] = []
    source_kind: str
    tape_number: Optional[str] = None
    source_ref: Optional[str] = None


class MediaResponse(BaseModel):
    id: int
    kind: str
    title: Optional[str]
    description: Optional[str]
    filename: str
    byte_size: int
    duration_sec: Optional[int]
    width: Optional[int]
    height: Optional[int]
    captured_at: Optional[datetime]
    tape_number: Optional[str]
    source_kind: str
    visibility: str
    status: str
    created_at: datetime
    tags: List[str] = []
    comments_count: int = 0

    class Config:
        from_attributes = True


class TagResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    body: str


class CommentResponse(BaseModel):
    id: int
    body: str
    user_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[MediaResponse])
async def get_media(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    tag_ids: Optional[List[int]] = Query(None),
    source: Optional[str] = Query(None),
    tape_number: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get media with filters"""
    media_service = MediaService(db)
    media_items = media_service.get_media(
        date_from=date_from,
        date_to=date_to,
        tag_ids=tag_ids,
        source=source,
        tape_number=tape_number,
        skip=skip,
        limit=limit
    )
    
    # Convert to response format
    result = []
    for media in media_items:
        # Get tags for this media
        tags = [mt.tag.name for mt in media.media_tags]
        
        # Get comments count
        comments_count = len([c for c in media.comments if c.deleted_at is None])
        
        result.append(MediaResponse(
            id=media.id,
            kind=media.kind.value,
            title=media.title,
            description=media.description,
            filename=media.filename,
            byte_size=media.byte_size,
            duration_sec=media.duration_sec,
            width=media.width,
            height=media.height,
            captured_at=media.captured_at,
            tape_number=media.tape_number,
            source_kind=media.source.kind.value,
            visibility=media.visibility.value,
            status=media.status.value,
            created_at=media.created_at,
            tags=tags,
            comments_count=comments_count
        ))
    
    return result


@router.get("/{media_id}", response_model=MediaResponse)
async def get_media_by_id(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific media by ID"""
    media_service = MediaService(db)
    media = media_service.get_media_by_id(media_id)
    
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Get tags for this media
    tags = [mt.tag.name for mt in media.media_tags]
    
    # Get comments count
    comments_count = len([c for c in media.comments if c.deleted_at is None])
    
    return MediaResponse(
        id=media.id,
        kind=media.kind.value,
        title=media.title,
        description=media.description,
        filename=media.filename,
        byte_size=media.byte_size,
        duration_sec=media.duration_sec,
        width=media.width,
        height=media.height,
        captured_at=media.captured_at,
        tape_number=media.tape_number,
        source_kind=media.source.kind.value,
        visibility=media.visibility.value,
        status=media.status.value,
        created_at=media.created_at,
        tags=tags,
        comments_count=comments_count
    )


@router.post("/", response_model=MediaResponse)
async def create_media(
    media_data: MediaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new media (admin only for now)"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create media"
        )
    
    media_service = MediaService(db)
    
    # Convert to DTO
    media_dto = MediaDTO(
        kind=media_data.kind,
        title=media_data.title,
        description=media_data.description,
        captured_at=media_data.captured_at.isoformat() if media_data.captured_at else None,
        tags=media_data.tags,
        source_kind=media_data.source_kind,
        tape_number=media_data.tape_number,
        source_ref=media_data.source_ref
    )
    
    try:
        media = media_service.create_media(media_dto, current_user.id)
        
        # Get tags for response
        tags = [mt.tag.name for mt in media.media_tags]
        
        return MediaResponse(
            id=media.id,
            kind=media.kind.value,
            title=media.title,
            description=media.description,
            filename=media.filename,
            byte_size=media.byte_size,
            duration_sec=media.duration_sec,
            width=media.width,
            height=media.height,
            captured_at=media.captured_at,
            tape_number=media.tape_number,
            source_kind=media.source.kind.value,
            visibility=media.visibility.value,
            status=media.status.value,
            created_at=media.created_at,
            tags=tags,
            comments_count=0
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/upload", response_model=MediaResponse)
async def upload_media(
    file: UploadFile = File(...),
    kind: str = Form(...),
    source_kind: str = Form(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tape_number: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload media file"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can upload media"
        )
    
    # Validate file type
    allowed_extensions = ['.mp4', '.mov', '.jpg', '.jpeg', '.png', '.heic', '.webp']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    
    # Create media directory if it doesn't exist
    media_dir = "/tmp/media"  # For now, use /tmp. In production, use proper storage
    os.makedirs(media_dir, exist_ok=True)
    file_path = os.path.join(media_dir, filename)
    
    # Read file content once
    content = await file.read()
    
    # Calculate file hash for duplicate detection
    file_hash = hashlib.sha256()
    file_hash.update(content)
    content_hash = file_hash.hexdigest()
    
    # Check for duplicate files BEFORE saving to disk
    existing_media = db.query(Media).filter(
        Media.content_hash == content_hash,
        Media.deleted_at.is_(None)
    ).first()
    
    if existing_media:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate file detected. A file with the same content already exists: {existing_media.title or existing_media.filename}"
        )
    
    # Only save file if no duplicate found
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Parse tags
    tag_list = []
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
    
    # Create media DTO
    media_dto = MediaDTO(
        kind=kind,
        title=title or os.path.splitext(file.filename)[0],
        description=description,
        captured_at=None,  # Will be set from file metadata if available
        tags=tag_list,
        source_kind=source_kind,
        tape_number=tape_number,
        source_ref=filename  # Use filename as source_ref for uploaded files
    )
    
    media_service = MediaService(db)
    
    try:
        media = media_service.create_media(media_dto, current_user.id)
        
        # Update media with file information
        media.filename = filename
        media.byte_size = len(content)
        media.content_hash = content_hash
        media.storage_path = file_path  # Set the storage path
        media.status = "READY"  # For uploaded files, mark as ready
        db.commit()
        
        # Get tags for response
        tags_response = [mt.tag.name for mt in media.media_tags]
        
        return MediaResponse(
            id=media.id,
            kind=media.kind.value,
            title=media.title,
            description=media.description,
            filename=media.filename,
            byte_size=media.byte_size,
            duration_sec=media.duration_sec,
            width=media.width,
            height=media.height,
            captured_at=media.captured_at,
            tape_number=media.tape_number,
            source_kind=media.source.kind.value,
            visibility=media.visibility.value,
            status=media.status.value,
            created_at=media.created_at,
            tags=tags_response,
            comments_count=0
        )
    except ValueError as e:
        # Clean up file if media creation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{media_id}/tags")
async def add_tag_to_media(
    media_id: int,
    tag_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add tag to media"""
    media_service = MediaService(db)
    
    try:
        media_service.add_tag_to_media(media_id, tag_name, current_user.id)
        return {"message": "Tag added successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{media_id}/tags/{tag_id}")
async def remove_tag_from_media(
    media_id: int,
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove tag from media"""
    media_service = MediaService(db)
    
    try:
        media_service.remove_tag_from_media(media_id, tag_id, current_user.id)
        return {"message": "Tag removed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{media_id}/comments", response_model=CommentResponse)
async def add_comment_to_media(
    media_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add comment to media"""
    media_service = MediaService(db)
    
    try:
        comment = media_service.add_comment_to_media(media_id, comment_data.body, current_user.id)
        return CommentResponse(
            id=comment.id,
            body=comment.body,
            user_name=comment.user.name,
            created_at=comment.created_at,
            updated_at=comment.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{media_id}/comments", response_model=List[CommentResponse])
async def get_media_comments(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comments for media"""
    media_service = MediaService(db)
    comments = media_service.get_media_comments(media_id)
    
    return [
        CommentResponse(
            id=comment.id,
            body=comment.body,
            user_name=comment.user.name,
            created_at=comment.created_at,
            updated_at=comment.updated_at
        )
        for comment in comments
        if comment.deleted_at is None
    ]


@router.get("/{media_id}/stream")
async def stream_media(
    media_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Stream media file for playback with range support"""
    media = db.query(Media).filter(Media.id == media_id, Media.deleted_at.is_(None)).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Check permissions
    if media.visibility == "PRIVATE" and media.uploaded_by != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this media"
        )
    
    # Construct file path
    media_dir = "/tmp/media"
    file_path = media.storage_path
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media file not found"
        )
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "application/octet-stream"
    
    # Handle range requests for video streaming
    range_header = request.headers.get('range')
    if range_header:
        # Parse range header (e.g., "bytes=0-1023")
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if range_match[1] else file_size - 1
        
        # Ensure end doesn't exceed file size
        end = min(end, file_size - 1)
        content_length = end - start + 1
        
        # Read the requested range
        def iterfile():
            with open(file_path, 'rb') as f:
                f.seek(start)
                remaining = content_length
                while remaining:
                    chunk_size = min(8192, remaining)  # 8KB chunks
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        
        headers = {
            'Content-Range': f'bytes {start}-{end}/{file_size}',
            'Accept-Ranges': 'bytes',
            'Content-Length': str(content_length),
            'Content-Type': content_type,
        }
        
        return StreamingResponse(
            iterfile(),
            status_code=206,
            headers=headers,
            media_type=content_type
        )
    else:
        # No range request - stream entire file
        def iterfile():
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(8192)  # 8KB chunks
                    if not chunk:
                        break
                    yield chunk
        
        headers = {
            'Accept-Ranges': 'bytes',
            'Content-Length': str(file_size),
            'Content-Type': content_type,
        }
        
        return StreamingResponse(
            iterfile(),
            status_code=200,
            headers=headers,
            media_type=content_type
        )


@router.get("/{media_id}/download")
async def download_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download media file"""
    media = db.query(Media).filter(Media.id == media_id, Media.deleted_at.is_(None)).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Check permissions
    if media.visibility == "PRIVATE" and media.uploaded_by != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download this media"
        )
    
    # Construct file path
    media_dir = "/tmp/media"
    file_path = media.storage_path
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media file not found"
        )
    
    return FileResponse(
        path=file_path,
        filename=media.filename
    )


@router.delete("/{media_id}")
async def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete media (soft delete)"""
    media = db.query(Media).filter(Media.id == media_id, Media.deleted_at.is_(None)).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Check permissions - only owner or admin can delete
    if media.uploaded_by != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this media"
        )
    
    # Soft delete
    from datetime import datetime
    media.deleted_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Media deleted successfully"}


