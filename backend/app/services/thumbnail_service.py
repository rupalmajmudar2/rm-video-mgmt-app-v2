import os
import cv2
from PIL import Image
from typing import Optional
import tempfile
import shutil


class ThumbnailService:
    """Service for generating thumbnails from images and videos"""
    
    def __init__(self, thumbnail_dir: str = "/tmp/thumbnails"):
        self.thumbnail_dir = thumbnail_dir
        os.makedirs(thumbnail_dir, exist_ok=True)
    
    def generate_thumbnail(self, media_path: str, media_kind: str, media_id: int) -> Optional[str]:
        """
        Generate a thumbnail for the given media file
        
        Args:
            media_path: Path to the media file
            media_kind: Type of media ('IMAGE' or 'VIDEO')
            media_id: ID of the media for unique filename
            
        Returns:
            Path to the generated thumbnail, or None if generation failed
        """
        try:
            if media_kind in ['IMAGE', 'PHOTO']:
                return self._generate_image_thumbnail(media_path, media_id)
            elif media_kind == 'VIDEO':
                return self._generate_video_thumbnail(media_path, media_id)
            else:
                return None
        except Exception as e:
            print(f"Error generating thumbnail for media {media_id}: {e}")
            return None
    
    def _generate_image_thumbnail(self, image_path: str, media_id: int) -> Optional[str]:
        """Generate thumbnail for image files"""
        try:
            # Open image with PIL
            with Image.open(image_path) as img:
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Calculate thumbnail size (maintain aspect ratio)
                max_size = (300, 200)  # width, height
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Generate thumbnail filename
                thumbnail_filename = f"thumb_{media_id}.jpg"
                thumbnail_path = os.path.join(self.thumbnail_dir, thumbnail_filename)
                
                # Save thumbnail
                img.save(thumbnail_path, 'JPEG', quality=85)
                
                return thumbnail_path
        except Exception as e:
            print(f"Error generating image thumbnail: {e}")
            return None
    
    def _generate_video_thumbnail(self, video_path: str, media_id: int) -> Optional[str]:
        """Generate thumbnail for video files"""
        try:
            # Open video with OpenCV
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                print(f"Could not open video file: {video_path}")
                return None
            
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            # Seek to 10% of the video (or frame 30, whichever is smaller)
            seek_frame = min(int(total_frames * 0.1), 30)
            cap.set(cv2.CAP_PROP_POS_FRAMES, seek_frame)
            
            # Read frame
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                print(f"Could not read frame from video: {video_path}")
                return None
            
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL Image
            pil_image = Image.fromarray(frame_rgb)
            
            # Calculate thumbnail size (maintain aspect ratio)
            max_size = (300, 200)  # width, height
            pil_image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Generate thumbnail filename
            thumbnail_filename = f"thumb_{media_id}.jpg"
            thumbnail_path = os.path.join(self.thumbnail_dir, thumbnail_filename)
            
            # Save thumbnail
            pil_image.save(thumbnail_path, 'JPEG', quality=85)
            
            return thumbnail_path
        except Exception as e:
            print(f"Error generating video thumbnail: {e}")
            return None
    
    def get_thumbnail_path(self, media_id: int) -> Optional[str]:
        """Get the path to an existing thumbnail"""
        thumbnail_filename = f"thumb_{media_id}.jpg"
        thumbnail_path = os.path.join(self.thumbnail_dir, thumbnail_filename)
        
        if os.path.exists(thumbnail_path):
            return thumbnail_path
        return None
    
    def delete_thumbnail(self, media_id: int) -> bool:
        """Delete thumbnail for a media item"""
        try:
            thumbnail_path = self.get_thumbnail_path(media_id)
            if thumbnail_path and os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
                return True
            return False
        except Exception as e:
            print(f"Error deleting thumbnail for media {media_id}: {e}")
            return False
