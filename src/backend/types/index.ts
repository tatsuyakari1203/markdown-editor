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
  folderPath?: string;
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
  folderPath?: string;
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

// Search API types
export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  documents: DocumentResponse[];
  total: number;
  query: string;
}

// Export API types
export interface ExportRequest {
  document_id: string;
  format: 'pdf' | 'html' | 'docx' | 'txt';
  options?: {
    include_toc?: boolean;
    page_size?: string;
    margin?: string;
  };
}

export interface ExportResponse {
  success: boolean;
  download_url?: string;
  filename?: string;
  message?: string;
}

// Settings API types
export interface UserSettings {
  id: number;
  user_id: number;
  theme: 'light' | 'dark' | 'auto';
  editor_font_size: number;
  editor_font_family: string;
  auto_save: boolean;
  vim_mode: boolean;
  line_numbers: boolean;
  word_wrap: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsRequest {
  theme?: 'light' | 'dark' | 'auto';
  editor_font_size?: number;
  editor_font_family?: string;
  auto_save?: boolean;
  vim_mode?: boolean;
  line_numbers?: boolean;
  word_wrap?: boolean;
}

// Media/OCR API types
export interface MediaFile {
  id: string;
  user_id: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface UploadResponse {
  success: boolean;
  file?: MediaFile;
  message?: string;
}

export interface OCRRequest {
  file_id: string;
  language?: string;
}

export interface OCRResponse {
  success: boolean;
  text?: string;
  confidence?: number;
  message?: string;
}