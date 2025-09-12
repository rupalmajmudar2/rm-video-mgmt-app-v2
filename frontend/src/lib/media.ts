import api from './api';
import { Media, Comment, MediaFilters } from '@/types';

export const mediaApi = {
  getMedia: async (filters: MediaFilters = {}): Promise<Media[]> => {
    const params = new URLSearchParams();
    
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.source) params.append('source', filters.source);
    if (filters.tape_number) params.append('tape_number', filters.tape_number);
    if (filters.tag_ids?.length) {
      filters.tag_ids.forEach(id => params.append('tag_ids', id.toString()));
    }
    if (filters.skip) params.append('skip', filters.skip.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/media?${params.toString()}`);
    return response.data;
  },

  getMediaById: async (id: number): Promise<Media> => {
    const response = await api.get(`/media/${id}`);
    return response.data;
  },

  getMediaComments: async (id: number): Promise<Comment[]> => {
    const response = await api.get(`/media/${id}/comments`);
    return response.data;
  },

  addComment: async (mediaId: number, body: string): Promise<Comment> => {
    const response = await api.post(`/media/${mediaId}/comments`, { body });
    return response.data;
  },

  addTag: async (mediaId: number, tagName: string): Promise<void> => {
    await api.post(`/media/${mediaId}/tags`, null, {
      params: { tag_name: tagName }
    });
  },

  removeTag: async (mediaId: number, tagId: number): Promise<void> => {
    await api.delete(`/media/${mediaId}/tags/${tagId}`);
  },

  uploadMedia: async (formData: FormData, onProgress?: (progress: number) => void, signal?: AbortSignal): Promise<Media> => {
    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  removeMedia: async (mediaId: number): Promise<void> => {
    await api.delete(`/media/${mediaId}`);
  },
};
