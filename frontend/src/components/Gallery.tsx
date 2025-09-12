'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mediaApi } from '@/lib/media';
import { Media, MediaFilters } from '@/types';
import MediaCard from './MediaCard';
import FilterSidebar from './FilterSidebar';
import Header from './Header';
import UploadModal from './UploadModal';

export default function Gallery() {
  const { user, logout } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filters, setFilters] = useState<MediaFilters>({
    skip: 0,
    limit: 50,
  });

  useEffect(() => {
    loadMedia();
  }, [filters]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await mediaApi.getMedia(filters);
      setMedia(data);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<MediaFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, skip: 0 }));
  };

  const handleUploadSuccess = () => {
    loadMedia(); // Refresh the media list
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user} 
        onLogout={logout} 
        onUploadClick={() => setShowUploadModal(true)}
      />
      
      <div className="flex">
        <FilterSidebar 
          filters={filters} 
          onFilterChange={handleFilterChange}
        />
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Media Gallery</h1>
            <p className="text-gray-600">
              {media.length} {media.length === 1 ? 'item' : 'items'} found
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {media.map((item) => (
                <MediaCard key={item.id} media={item} />
              ))}
            </div>
          )}

          {!loading && media.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No media found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your filters or check back later
              </p>
            </div>
          )}
        </main>
      </div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
