export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'USER' | 'GUEST';
  is_blocked: boolean;
  created_at: string;
}

export interface Media {
  id: number;
  kind: 'PHOTO' | 'VIDEO';
  title?: string;
  description?: string;
  filename: string;
  byte_size: number;
  duration_sec?: number;
  width?: number;
  height?: number;
  captured_at?: string;
  tape_number?: string;
  source_kind: string;
  visibility: 'PRIVATE' | 'LINK' | 'AUTHED';
  status: 'READY' | 'PROCESSING' | 'FAILED';
  created_at: string;
  tags: string[];
  comments_count: number;
}

export interface Comment {
  id: number;
  body: string;
  user_name: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export interface LoginRequest {
  username: string; // email
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MediaFilters {
  tag_ids?: number[];
  source?: string;
  tape_number?: string;
  skip?: number;
  limit?: number;
}
