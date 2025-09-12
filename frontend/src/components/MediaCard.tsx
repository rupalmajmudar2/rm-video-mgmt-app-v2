'use client';

import { useState, useEffect } from 'react';
import { Media, Comment } from '@/types';
import { Play, Image, MessageCircle, Tag as TagIcon, Calendar, X, Plus, Send, Trash2 } from 'lucide-react';
import { mediaApi } from '@/lib/media';

interface MediaCardProps {
  media: Media;
}

export default function MediaCard({ media }: MediaCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [tags, setTags] = useState<string[]>(media.tags || []);

  // Load comments when component mounts
  useEffect(() => {
    loadComments();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getVideoUrl = () => {
    const token = localStorage.getItem('access_token');
    return `/api/media/${media.id}/stream?token=${token}`;
  };

  const getImageUrl = () => {
    const token = localStorage.getItem('access_token');
    return `/api/media/${media.id}/stream?token=${token}`;
  };

  const getDownloadUrl = () => {
    const token = localStorage.getItem('access_token');
    return `/api/media/${media.id}/download?token=${token}`;
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (media.kind === 'VIDEO') {
      setIsPlaying(true);
      setShowDetails(true);
      setVideoLoading(true);
      loadComments();
      
      // Preload the video after a short delay
      setTimeout(() => {
        const video = document.querySelector('video');
        if (video) {
          video.load();
        }
      }, 100);
    }
  };

  const handleCardClick = () => {
    setShowDetails(true);
    loadComments();
  };

  const loadComments = async () => {
    try {
      const commentsData = await mediaApi.getMediaComments(media.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    try {
      await mediaApi.addTag(media.id, newTag.trim());
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const comment = await mediaApi.addComment(media.id, newComment.trim());
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      // Find the tag ID (this would need to be implemented in the API)
      // For now, just remove from local state
      setTags(tags.filter(tag => tag !== tagToRemove));
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleRemoveVideo = async () => {
    if (!confirm('Are you sure you want to remove this video? This action cannot be undone.')) {
      return;
    }

    try {
      // This would need to be implemented in the API
      await mediaApi.removeMedia(media.id);
      // Refresh the page or remove from parent component
      window.location.reload();
    } catch (error) {
      console.error('Failed to remove video:', error);
      alert('Failed to remove video. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Media Preview */}
      <div className="aspect-video bg-gray-100 relative group cursor-pointer" onClick={handleCardClick}>
        {media.kind === 'VIDEO' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={handlePlayClick}
              className="bg-black bg-opacity-50 rounded-full p-4 hover:bg-opacity-70 transition-all"
            >
              <Play className="h-8 w-8 text-white" />
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Remove Video Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveVideo();
          }}
          className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        
        {/* Tape Number Badge for VideoTape */}
        {media.source_kind === 'VIDEOTAPE' && media.tape_number && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            Tape #{media.tape_number}
          </div>
        )}
        
        {/* Duration for videos */}
        {media.kind === 'VIDEO' && media.duration_sec && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {formatDuration(media.duration_sec)}
          </div>
        )}
      </div>

      {/* Media Info - Compact */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 truncate text-sm">
          {media.title || media.filename}
        </h3>
        
        {media.description && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
            {media.description}
          </p>
        )}

        {/* Metadata - Compact */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(media.created_at)}
            </span>
            <span>{formatFileSize(media.byte_size)}</span>
          </div>
          
          {media.width && media.height && (
            <div className="text-xs text-gray-500 text-center">
              {media.width}×{media.height}
            </div>
          )}
        </div>

        {/* Tags - Compact */}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700"
              >
                <TagIcon className="h-2 w-2 mr-1" />
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-xs text-gray-500 px-1">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Comments preview - Compact */}
        {comments.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <MessageCircle className="h-3 w-3 mr-1" />
              {comments.length}
            </div>
            <div className="space-y-1 max-h-16 overflow-y-auto">
              {comments.slice(0, 1).map((comment) => (
                <div key={comment.id} className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded">
                  <div className="truncate">{comment.body}</div>
                </div>
              ))}
              {comments.length > 1 && (
                <div className="text-xs text-gray-400 text-center">
                  +{comments.length - 1} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal for details and video playback */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowDetails(false);
          setIsPlaying(false);
          setVideoLoading(false);
        }}>
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{media.title || media.filename}</h2>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setIsPlaying(false);
                  setVideoLoading(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {media.description && (
              <p className="text-gray-600 mb-4">{media.description}</p>
            )}

            {/* Video Player */}
            {media.kind === 'VIDEO' && isPlaying && (
              <div className="mb-6">
                <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                  {videoLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg z-10">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p>Loading video...</p>
                      </div>
                    </div>
                  )}
                        <video
                          controls
                          preload="none"
                          playsInline
                          className="w-full h-full bg-black rounded-lg"
                          onLoadStart={() => {
                            console.log('Video loading started');
                            setVideoLoading(true);
                          }}
                          onCanPlay={() => {
                            console.log('Video can play');
                            setVideoLoading(false);
                          }}
                          onLoadedData={() => {
                            console.log('Video data loaded');
                            setVideoLoading(false);
                          }}
                          onError={(e) => {
                            console.error('Video playback error:', e);
                            setVideoLoading(false);
                          }}
                        >
                    <source src={getVideoUrl()} type="video/mp4" />
                    <source src={getDownloadUrl()} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}

            {/* Image Display */}
            {media.kind === 'PHOTO' && (
              <div className="mb-6">
                <img
                  src={getImageUrl()}
                  alt={media.title || media.filename}
                  className="w-full max-h-96 object-contain bg-gray-100 rounded-lg"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    // Fallback to file download
                  }}
                />
              </div>
            )}

            {/* Metadata - 2 columns */}
            <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
              <div className="flex justify-between">
                <span className="font-medium">Type:</span> 
                <span>{media.kind}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Source:</span> 
                <span>{media.source_kind}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Size:</span> 
                <span>{formatFileSize(media.byte_size)}</span>
              </div>
              {media.tape_number && (
                <div className="flex justify-between">
                  <span className="font-medium">Tape #:</span> 
                  <span>{media.tape_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Uploaded:</span> 
                <span>{formatDate(media.created_at)}</span>
              </div>
              {media.duration_sec && (
                <div className="flex justify-between">
                  <span className="font-medium">Duration:</span> 
                  <span>{formatDuration(media.duration_sec)}</span>
                </div>
              )}
              {media.width && media.height && (
                <div className="flex justify-between">
                  <span className="font-medium">Resolution:</span> 
                  <span>{media.width}×{media.height}</span>
                </div>
              )}
            </div>

            {/* Tags Section - Compact */}
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Tags</h3>
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="w-32 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </form>
              </div>
              
              {/* Current Tags - All on one line */}
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    <TagIcon className="h-3 w-3 mr-1" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Comments Section - Compact */}
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Comments ({comments.length})</h3>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add comment..."
                    className="w-40 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-xs"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </form>
              </div>
              
              {/* Comments List - Format: "C1 [username, timestamp]" */}
              <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                {comments.map((comment, index) => (
                  <div key={comment.id} className="bg-gray-50 p-2 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600">C{index + 1}</span>
                      <span className="text-gray-700">{comment.body}</span>
                      <span className="text-gray-500 text-xs ml-auto">
                        [{comment.user_name}, {new Date(comment.created_at).toLocaleDateString()}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowDetails(false);
                  setIsPlaying(false);
                  setVideoLoading(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
