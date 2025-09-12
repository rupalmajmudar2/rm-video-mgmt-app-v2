'use client';

import { useState } from 'react';
import { MediaFilters } from '@/types';
import { Tag, Filter, X } from 'lucide-react';

interface FilterSidebarProps {
  filters: MediaFilters;
  onFilterChange: (filters: Partial<MediaFilters>) => void;
}

export default function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sources = [
    { value: 'VIDEOTAPE', label: 'Video Tapes' },
    { value: 'ICLOUD', label: 'iCloud' },
    { value: 'GOOGLE_PHOTOS', label: 'Google Photos' },
    { value: 'GOOGLE_DRIVE', label: 'Google Drive' },
    { value: 'USER_UPLOAD', label: 'User Uploads' },
  ];

  const clearFilters = () => {
    onFilterChange({
      source: undefined,
      tape_number: undefined,
      tag_ids: undefined,
    });
  };

  const hasActiveFilters = filters.source || filters.tape_number || filters.tag_ids?.length;

  return (
    <>
      {/* Mobile filter button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-40 bg-white border border-gray-300 rounded-lg p-2 shadow-sm"
      >
        <Filter className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-0 z-50 lg:relative lg:z-auto ${isOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsOpen(false)} />
        
        <div className="lg:block fixed lg:relative inset-y-0 left-0 w-64 bg-white shadow-lg lg:shadow-none">
          <div className="flex items-center justify-between p-4 border-b lg:hidden">
            <h2 className="text-lg font-semibold">Filters</h2>
            <button onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={filters.source || ''}
                onChange={(e) => onFilterChange({ source: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                {sources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tape Number Filter (only for VideoTape) */}
            {filters.source === 'VIDEOTAPE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tape Number
                </label>
                <input
                  type="text"
                  value={filters.tape_number || ''}
                  onChange={(e) => onFilterChange({ tape_number: e.target.value || undefined })}
                  placeholder="Enter tape number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}


            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
