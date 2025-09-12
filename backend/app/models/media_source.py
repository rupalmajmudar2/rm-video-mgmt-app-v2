from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel


class MediaDTO(BaseModel):
    """Data Transfer Object for media operations"""
    kind: str  # PHOTO, VIDEO
    title: Optional[str] = None
    description: Optional[str] = None
    captured_at: Optional[str] = None
    tags: list[str] = []
    source_kind: str
    tape_number: Optional[str] = None
    source_ref: Optional[str] = None


class MediaSource(ABC):
    """Abstract base class for media sources with validation"""
    
    def __init__(self, kind: str):
        self.kind = kind
    
    @abstractmethod
    def validate(self, media_dto: MediaDTO) -> None:
        """Validate media DTO according to source-specific rules"""
        pass
    
    def normalize(self, media_dto: MediaDTO) -> MediaDTO:
        """Normalize media DTO (e.g., trim strings, convert empty to None)"""
        if media_dto.tape_number:
            media_dto.tape_number = media_dto.tape_number.strip()
            if not media_dto.tape_number:
                media_dto.tape_number = None
        elif media_dto.tape_number == "":
            media_dto.tape_number = None
        
        if media_dto.title:
            media_dto.title = media_dto.title.strip()
            if not media_dto.title:
                media_dto.title = None
                
        if media_dto.description:
            media_dto.description = media_dto.description.strip()
            if not media_dto.description:
                media_dto.description = None
        
        # Normalize tags
        media_dto.tags = [tag.strip().lower() for tag in media_dto.tags if tag.strip()]
        
        return media_dto
    
    def hydrate(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Hydrate metadata with provider-specific data"""
        return metadata


class VideoTapeSource(MediaSource):
    """VideoTape source - requires tape_number"""
    
    def __init__(self):
        super().__init__("VIDEOTAPE")
    
    def validate(self, media_dto: MediaDTO) -> None:
        """VideoTape requires tape_number and it must be non-empty"""
        if not media_dto.tape_number or not media_dto.tape_number.strip():
            raise ValueError("VideoTape source requires tape_number")
        
        # Additional validation can be added here
        if len(media_dto.tape_number.strip()) > 32:
            raise ValueError("tape_number must be 32 characters or less")


class ICloudSource(MediaSource):
    """iCloud source - forbids tape_number"""
    
    def __init__(self):
        super().__init__("ICLOUD")
    
    def validate(self, media_dto: MediaDTO) -> None:
        """iCloud source forbids tape_number"""
        if media_dto.tape_number:
            raise ValueError("iCloud source cannot have tape_number")
    
    def hydrate(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Hydrate with iCloud-specific metadata"""
        # Add iCloud-specific metadata processing
        return metadata


class GooglePhotosSource(MediaSource):
    """Google Photos source - forbids tape_number"""
    
    def __init__(self):
        super().__init__("GOOGLE_PHOTOS")
    
    def validate(self, media_dto: MediaDTO) -> None:
        """Google Photos source forbids tape_number"""
        if media_dto.tape_number:
            raise ValueError("Google Photos source cannot have tape_number")
    
    def hydrate(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Hydrate with Google Photos-specific metadata"""
        return metadata


class GoogleDriveSource(MediaSource):
    """Google Drive source - forbids tape_number"""
    
    def __init__(self):
        super().__init__("GOOGLE_DRIVE")
    
    def validate(self, media_dto: MediaDTO) -> None:
        """Google Drive source forbids tape_number"""
        if media_dto.tape_number:
            raise ValueError("Google Drive source cannot have tape_number")
    
    def hydrate(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Hydrate with Google Drive-specific metadata"""
        return metadata


class GuestUploadSource(MediaSource):
    """Guest Upload source - forbids tape_number"""
    
    def __init__(self):
        super().__init__("GUEST_UPLOAD")
    
    def validate(self, media_dto: MediaDTO) -> None:
        """Guest Upload source forbids tape_number"""
        if media_dto.tape_number:
            raise ValueError("Guest Upload source cannot have tape_number")


class UserUploadSource(MediaSource):
    """User Upload source - forbids tape_number"""
    
    def __init__(self):
        super().__init__("USER_UPLOAD")
    
    def validate(self, media_dto: MediaDTO) -> None:
        """User Upload source forbids tape_number"""
        if media_dto.tape_number:
            raise ValueError("User Upload source cannot have tape_number")


# Factory function to get the appropriate source validator
def get_media_source(kind: str) -> MediaSource:
    """Factory function to get the appropriate MediaSource instance"""
    sources = {
        "VIDEOTAPE": VideoTapeSource,
        "ICLOUD": ICloudSource,
        "GOOGLE_PHOTOS": GooglePhotosSource,
        "GOOGLE_DRIVE": GoogleDriveSource,
        "GUEST_UPLOAD": GuestUploadSource,
        "USER_UPLOAD": UserUploadSource,
    }
    
    if kind not in sources:
        raise ValueError(f"Unknown media source kind: {kind}")
    
    return sources[kind]()
