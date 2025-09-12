'use client';

import { User } from '@/types';
import { LogOut, User as UserIcon, Upload } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onUploadClick?: () => void;
}

export default function Header({ user, onLogout, onUploadClick }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Video Gallery
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {onUploadClick && (
              <button
                onClick={onUploadClick}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
            )}
            
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-700">{user.name}</span>
              {user.role === 'ADMIN' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Admin
                </span>
              )}
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
