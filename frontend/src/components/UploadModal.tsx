'use client';

import { useState, useRef } from 'react';
import { X, Upload, Video, Image, AlertCircle } from 'lucide-react';
import { mediaApi } from '@/lib/media';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tapeNumber, setTapeNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [sourceKind, setSourceKind] = useState<'VIDEOTAPE' | 'ICLOUD' | 'GOOGLE_PHOTOS' | 'USER_UPLOAD'>('VIDEOTAPE');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setCancelled(false);
      
      // Auto-generate title from filename if not set
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCancelled(true);
    setUploading(false);
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    // Validate VideoTape requirements
    if (sourceKind === 'VIDEOTAPE' && !tapeNumber.trim()) {
      setError('Tape number is required for VideoTape uploads');
      return;
    }

    // Validate non-VideoTape sources don't have tape number
    if (sourceKind !== 'VIDEOTAPE' && tapeNumber.trim()) {
      setError(`${sourceKind.replace('_', ' ')} sources cannot have a tape number`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setCancelled(false);

    // Create AbortController for cancel functionality
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('kind', selectedFile.type.startsWith('video/') ? 'VIDEO' : 'PHOTO');
      formData.append('source_kind', sourceKind);
      formData.append('title', title);
      formData.append('description', description);
      
      if (tapeNumber.trim()) {
        formData.append('tape_number', tapeNumber.trim());
      }
      
      if (tags.trim()) {
        formData.append('tags', tags.trim());
      }

      await mediaApi.uploadMedia(formData, (progress) => {
        if (!cancelled) {
          setUploadProgress(progress);
        }
      }, abortControllerRef.current.signal);
      
      if (!cancelled) {
        // Reset form
        setSelectedFile(null);
        setTapeNumber('');
        setTitle('');
        setDescription('');
        setTags('');
        setSourceKind('VIDEOTAPE');
        
        onUploadSuccess();
        onClose();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || cancelled) {
        setError('Upload cancelled');
      } else if (err.response?.status === 409) {
        setError(`Duplicate file detected: ${err.response?.data?.detail || 'A file with the same content already exists'}`);
      } else {
        setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSourceChange = (newSource: typeof sourceKind) => {
    setSourceKind(newSource);
    if (newSource !== 'VIDEOTAPE') {
      setTapeNumber('');
    }
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Upload Media</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Source Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'VIDEOTAPE', label: 'Video Tape', icon: Video },
                { value: 'ICLOUD', label: 'iCloud', icon: Image },
                { value: 'GOOGLE_PHOTOS', label: 'Google Photos', icon: Image },
                { value: 'USER_UPLOAD', label: 'User Upload', icon: Upload },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSourceChange(value as typeof sourceKind)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    sourceKind === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <div className="text-sm font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tape Number (only for VideoTape) */}
          {sourceKind === 'VIDEOTAPE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tape Number *
              </label>
              <input
                type="text"
                value={tapeNumber}
                onChange={(e) => setTapeNumber(e.target.value)}
                placeholder="e.g., TAPE001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for VideoTape sources. Must be unique.
              </p>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                onChange={handleFileSelect}
                accept="video/*,image/*"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : 'Click to select file'}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  Supports video and image files
                </span>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter media title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter media description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas (e.g., family, vacation, 2023)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="pt-4 border-t">
              <div className="mb-2 flex justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  Cancel Upload
                </button>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
