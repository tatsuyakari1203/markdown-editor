import type { IStorageStrategy, Document } from '../types/storage';
import type { Tab } from '../contexts/TabManagerContext';

interface ApiDocument {
  id: string;
  title: string;
  content: string;
  path: string;
  is_directory: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  document?: T;
  documents?: T[];
}

export class DatabaseStorageStrategy implements IStorageStrategy {
  private baseUrl = '/api';
  private isAuthenticated = false;

  constructor() {
    this.checkAuthStatus();
  }

  private async checkAuthStatus(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/status`, {
        credentials: 'include'
      });
      const data = await response.json();
      this.isAuthenticated = data.authenticated;
    } catch (error) {
      console.error('Failed to check auth status:', error);
      this.isAuthenticated = false;
    }
  }

  private convertApiDocumentToDocument(apiDoc: ApiDocument): Document {
    return {
      id: apiDoc.id,
      title: apiDoc.title,
      content: apiDoc.content,
      lastModified: new Date(apiDoc.updated_at).getTime()
    };
  }

  private convertTabToApiDocument(tab: Tab): Partial<ApiDocument> {
    return {
      title: tab.title,
      content: tab.content,
      path: tab.path || `/${tab.title.replace(/\s+/g, '-').toLowerCase()}.md`
    };
  }

  async getDocument(id: string): Promise<Document | null> {
    if (!this.isAuthenticated) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/documents/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ApiResponse<ApiDocument> = await response.json();
      if (data.success && data.document) {
        return this.convertApiDocumentToDocument(data.document);
      }
      return null;
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  async saveDocument(id: string, tab: Tab): Promise<boolean> {
    if (!this.isAuthenticated) {
      return false;
    }

    try {
      const apiDoc = this.convertTabToApiDocument(tab);
      
      // Check if document exists
      const existingDoc = await this.getDocument(id);
      
      let response: Response;
      if (existingDoc) {
        // Update existing document
        response = await fetch(`${this.baseUrl}/documents/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(apiDoc)
        });
      } else {
        // Create new document
        response = await fetch(`${this.baseUrl}/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            ...apiDoc,
            // Use the tab id as document id for new documents
            id
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

  // Additional methods for authentication
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

      const data = await response.json();
      
      if (data.success) {
        this.isAuthenticated = true;
      }
      
      return {
        success: data.success,
        message: data.message || (data.success ? 'Login successful' : 'Login failed')
      };
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

      const data = await response.json();
      
      return {
        success: data.success,
        message: data.message || (data.success ? 'Registration successful' : 'Registration failed')
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        message: 'Network error occurred'
      };
    }
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        this.isAuthenticated = false;
      }
      
      return {
        success: data.success,
        message: data.message || (data.success ? 'Logout successful' : 'Logout failed')
      };
    } catch (error) {
      console.error('Logout failed:', error);
      return {
        success: false,
        message: 'Network error occurred'
      };
    }
  }

  async getFileTree(): Promise<any[]> {
    if (!this.isAuthenticated) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/documents/tree`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.tree || [];
    } catch (error) {
      console.error('Failed to get file tree:', error);
      return [];
    }
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }
}