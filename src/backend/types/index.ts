export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: number;
  title: string;
  content: string;
  path: string;
  is_directory: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface FileTreeNode {
  id: string;
  title: string;
  path: string;
  is_directory: boolean;
  parent_id: string | null;
  children?: FileTreeNode[];
}

// API Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: number;
    username: string;
  };
  message?: string;
}

export interface DocumentRequest {
  title: string;
  content: string;
  path: string;
  parent_id?: string;
}

export interface DocumentResponse {
  id: string;
  title: string;
  content: string;
  path: string;
  is_directory: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDirectoryRequest {
  title: string;
  path: string;
  parent_id?: string;
}

export interface MoveDocumentRequest {
  new_path: string;
  new_parent_id?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}