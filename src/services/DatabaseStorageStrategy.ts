import type { IStorageStrategy, Document } from '../types/storage';
import type { Tab } from '../contexts/TabManagerContext';
import type { IStorageStrategy, Document } from '../core/strategies/IStorageStrategy';

interface ApiDocument {
  id: string;
  title: string;
  content: string;
  folderPath: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: {
    document?: T;
    documents?: T[];
    user?: any;
    session?: any;
  };
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: number;
      username: string;
    };
    session?: {
      token: string;
      expiresAt: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export class DatabaseStorageStrategy implements IStorageStrategy {
  private baseUrl = 'http://localhost:3001/api';
  private authToken: string | null = null;

  constructor() {
    // Load token from localStorage if available
    this.authToken = localStorage.getItem('auth_token');
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      },
      credentials: 'include'
    });
  }

  private convertApiDocumentToDocument(apiDoc: ApiDocument): Document {
    return {
      id: apiDoc.id,
      title: apiDoc.title,
      content: apiDoc.content,
      lastModified: new Date(apiDoc.updatedAt).getTime()
    };
  }

  private convertTabToApiDocument(tab: Tab): Partial<ApiDocument> {
    return {
      title: tab.title,
      content: tab.content,
      folderPath: tab.path || '/'
    };
  }

  async getDocument(id: string): Promise<Document | null> {
    if (!this.authToken) {
      return null;
    }

    try {
      const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/documents/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ApiResponse<ApiDocument> = await response.json();
      if (data.success && data.data?.document) {
        return this.convertApiDocumentToDocument(data.data.document);
      }
      return null;
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  async saveDocument(id: string, tab: Tab): Promise<boolean> {
    if (!this.authToken) {
      return false;
    }

    try {
      const apiDoc = this.convertTabToApiDocument(tab);
      
      // Check if document exists
      const existingDoc = await this.getDocument(id);
      
      let response: Response;
      if (existingDoc) {
        // Update existing document
        response = await this.makeAuthenticatedRequest(`${this.baseUrl}/documents/${id}`, {
          method: 'PUT',
          body: JSON.stringify(apiDoc)
        });
      } else {
        // Create new document
        response = await this.makeAuthenticatedRequest(`${this.baseUrl}/documents`, {
          method: 'POST',
          body: JSON.stringify({
            ...apiDoc,
            id // Use the tab id as document id for new documents
          })
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ApiResponse<ApiDocument> = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to save document:', error);
      return false;
    }
  }

  onUpdate(callback: (documents: Record<string, Document>) => void): () => void {
    // For now, we don't implement real-time updates
    // This could be enhanced with WebSockets or polling
    return () => {};
  }

  // Authentication methods
  async login(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data: AuthResponse = await response.json();
      
      if (data.success && data.data?.session?.token) {
        this.authToken = data.data.session.token;
        localStorage.setItem('auth_token', this.authToken);
        return {
          success: true,
          message: 'Login successful'
        };
      } else {
        return {
          success: false,
          message: data.error?.message || 'Login failed'
        };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: 'Network error occurred'
      };
    }
  }

  async register(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data: AuthResponse = await response.json();
      
      if (data.success) {
        return {
          success: true,
          message: 'Registration successful'
        };
      } else {
        return {
          success: false,
          message: data.error?.message || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        message: 'Network error occurred'
      };
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.authToken) {
        await this.makeAuthenticatedRequest(`${this.baseUrl}/auth/logout`, {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Always clear local auth state
      this.authToken = null;
      localStorage.removeItem('auth_token');
    }
  }

  async getCurrentUser(): Promise<{ id: number; username: string } | null> {
    if (!this.authToken) {
      return null;
    }

    try {
      const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/auth/me`);

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear it
          this.authToken = null;
          localStorage.removeItem('auth_token');
        }
        return null;
      }

      const data: ApiResponse<any> = await response.json();
      if (data.success && data.data?.user) {
        return data.data.user;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    if (!this.authToken) {
      return [];
    }

    try {
      const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/documents`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ApiResponse<ApiDocument> = await response.json();
      if (data.success && data.data?.documents) {
        return data.data.documents.map(doc => this.convertApiDocumentToDocument(doc));
      }
      return [];
    } catch (error) {
      console.error('Failed to get documents:', error);
      return [];
    }
  }

  getIsAuthenticated(): boolean {
    return !!this.authToken;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }
}