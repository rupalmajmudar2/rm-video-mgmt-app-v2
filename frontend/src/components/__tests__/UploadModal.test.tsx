/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadModal from '../UploadModal';

// Mock the media API
jest.mock('../../lib/media', () => ({
  uploadMedia: jest.fn(),
}));

// Mock the media API module
const mockUploadMedia = require('../../lib/media').uploadMedia;

describe('UploadModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUploadSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onUploadSuccess: mockOnUploadSuccess,
  };

  it('renders upload modal when open', () => {
    render(<UploadModal {...defaultProps} />);
    
    expect(screen.getByText('Upload Media')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('handles file selection', () => {
    render(<UploadModal {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(screen.getByText('test.mp4')).toBeInTheDocument();
  });

  it('shows cancel button during upload', async () => {
    // Mock a slow upload
    mockUploadMedia.mockImplementation(() => 
      new Promise((resolve) => setTimeout(() => resolve({ id: 1 }), 1000))
    );

    render(<UploadModal {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText('Cancel Upload')).toBeInTheDocument();
    });
  });

  it('cancels upload when cancel button is clicked', async () => {
    let abortController: AbortController;
    
    // Mock upload with AbortController
    mockUploadMedia.mockImplementation((formData: FormData, onProgress: Function, signal?: AbortSignal) => {
      abortController = new AbortController();
      return new Promise((resolve, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new Error('AbortError'));
          });
        }
        setTimeout(() => resolve({ id: 1 }), 1000);
      });
    });

    render(<UploadModal {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText('Cancel Upload')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByText('Cancel Upload');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.getByText('Upload cancelled')).toBeInTheDocument();
    });
  });

  it('handles duplicate file error', async () => {
    const duplicateError = {
      response: {
        status: 409,
        data: {
          detail: 'Duplicate file detected. A file with the same content already exists: Existing Video'
        }
      }
    };
    
    mockUploadMedia.mockRejectedValueOnce(duplicateError);

    render(<UploadModal {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Duplicate file detected/)).toBeInTheDocument();
    });
  });

  it('handles upload success', async () => {
    const mockMedia = { id: 1, title: 'Test Video' };
    mockUploadMedia.mockResolvedValueOnce(mockMedia);

    render(<UploadModal {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalledWith(mockMedia);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('disables upload button when no file selected', () => {
    render(<UploadModal {...defaultProps} />);
    
    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).toBeDisabled();
  });

  it('enables upload button when file is selected', () => {
    render(<UploadModal {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).not.toBeDisabled();
  });

  it('shows progress bar during upload', async () => {
    let progressCallback: Function;
    
    mockUploadMedia.mockImplementation((formData: FormData, onProgress: Function) => {
      progressCallback = onProgress;
      return new Promise((resolve) => {
        setTimeout(() => {
          onProgress(50);
          setTimeout(() => {
            onProgress(100);
            resolve({ id: 1 });
          }, 100);
        }, 100);
      });
    });

    render(<UploadModal {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });
});
