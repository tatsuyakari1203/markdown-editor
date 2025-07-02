import { randomUUID } from 'crypto';
import { db } from '../database/connection.js';
import type { Document, DocumentRequest, CreateDirectoryRequest, MoveDocumentRequest, FileTreeNode } from '../types/index.js';

export class DocumentService {
  private static getDocumentById = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?');
  private static getDocumentsByUserId = db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY is_directory DESC, title ASC');
  private static getDocumentsByParentId = db.prepare('SELECT * FROM documents WHERE parent_id = ? AND user_id = ? ORDER BY is_directory DESC, title ASC');
  private static getRootDocuments = db.prepare('SELECT * FROM documents WHERE parent_id IS NULL AND user_id = ? ORDER BY is_directory DESC, title ASC');
  private static insertDocument = db.prepare('INSERT INTO documents (id, user_id, title, content, path, is_directory, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  private static updateDocumentStmt = db.prepare('UPDATE documents SET title = ?, content = ?, path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?');
  private static deleteDocumentStmt = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?');
  private static moveDocumentStmt = db.prepare('UPDATE documents SET path = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?');
  private static getChildDocuments = db.prepare('SELECT * FROM documents WHERE parent_id = ? AND user_id = ?');
  private static checkPathExists = db.prepare('SELECT id FROM documents WHERE path = ? AND user_id = ?');

  static createDocument(userId: number, data: DocumentRequest): { success: boolean; message: string; document?: Document } {
    try {
      console.log('Creating document with data:', { userId, data });
      
      // Check if path already exists
      const existingDoc = this.checkPathExists.get(data.path, userId);
      console.log('Existing doc check result:', existingDoc);
      if (existingDoc) {
        return { success: false, message: 'A document with this path already exists' };
      }

      // Validate parent_id if provided
      if (data.parent_id) {
        const parent = this.getDocumentById.get(data.parent_id, userId) as Document | undefined;
        if (!parent || !parent.is_directory) {
          return { success: false, message: 'Invalid parent directory' };
        }
      }

      const documentId = randomUUID();
      console.log('Generated document ID:', documentId);
      
      console.log('About to insert document with params:', {
        documentId,
        userId,
        title: data.title,
        content: data.content,
        path: data.path,
        is_directory: false,
        parent_id: data.parent_id || null
      });
      
      this.insertDocument.run(
        documentId,
        userId,
        data.title,
        data.content,
        data.path,
        0, // is_directory (0 = false)
        data.parent_id || null
      );
      
      console.log('Document inserted successfully');

      const document = this.getDocumentById.get(documentId, userId) as Document;
      console.log('Retrieved document:', document);
      return { success: true, message: 'Document created successfully', document };
    } catch (error) {
      console.error('Create document error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static createDirectory(userId: number, data: CreateDirectoryRequest): { success: boolean; message: string; document?: Document } {
    try {
      // Check if path already exists
      const existingDoc = this.checkPathExists.get(data.path, userId);
      if (existingDoc) {
        return { success: false, message: 'A directory with this path already exists' };
      }

      // Validate parent_id if provided
      if (data.parent_id) {
        const parent = this.getDocumentById.get(data.parent_id, userId) as Document | undefined;
        if (!parent || !parent.is_directory) {
          return { success: false, message: 'Invalid parent directory' };
        }
      }

      const directoryId = randomUUID();
      
      this.insertDocument.run(
        directoryId,
        userId,
        data.title,
        '', // empty content for directories
        data.path,
        1, // is_directory (1 = true)
        data.parent_id || null
      );

      const directory = this.getDocumentById.get(directoryId, userId) as Document;
      return { success: true, message: 'Directory created successfully', document: directory };
    } catch (error) {
      console.error('Create directory error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static getDocument(userId: number, documentId: string): { success: boolean; message: string; document?: Document } {
    try {
      const document = this.getDocumentById.get(documentId, userId) as Document | undefined;
      if (!document) {
        return { success: false, message: 'Document not found' };
      }

      return { success: true, message: 'Document retrieved successfully', document };
    } catch (error) {
      console.error('Get document error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static updateDocument(userId: number, documentId: string, data: Partial<DocumentRequest>): { success: boolean; message: string; document?: Document } {
    try {
      const existingDoc = this.getDocumentById.get(documentId, userId) as Document | undefined;
      if (!existingDoc) {
        return { success: false, message: 'Document not found' };
      }

      // Check if new path conflicts with existing documents (if path is being changed)
      if (data.path && data.path !== existingDoc.path) {
        const conflictingDoc = this.checkPathExists.get(data.path, userId);
        if (conflictingDoc) {
          return { success: false, message: 'A document with this path already exists' };
        }
      }

      const updatedData = {
        title: data.title ?? existingDoc.title,
        content: data.content ?? existingDoc.content,
        path: data.path ?? existingDoc.path
      };

      this.updateDocumentStmt.run(
        updatedData.title,
        updatedData.content,
        updatedData.path,
        documentId,
        userId
      );

      const document = this.getDocumentById.get(documentId, userId) as Document;
      return { success: true, message: 'Document updated successfully', document };
    } catch (error) {
      console.error('Update document error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static deleteDocument(userId: number, documentId: string): { success: boolean; message: string } {
    try {
      const document = this.getDocumentById.get(documentId, userId) as Document | undefined;
      if (!document) {
        return { success: false, message: 'Document not found' };
      }

      // If it's a directory, check if it has children
      if (document.is_directory) {
        const children = this.getChildDocuments.all(documentId, userId);
        if (children.length > 0) {
          return { success: false, message: 'Cannot delete directory that contains files or subdirectories' };
        }
      }

      this.deleteDocumentStmt.run(documentId, userId);
      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      console.error('Delete document error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static moveDocument(userId: number, documentId: string, data: MoveDocumentRequest): { success: boolean; message: string; document?: Document } {
    try {
      const document = this.getDocumentById.get(documentId, userId) as Document | undefined;
      if (!document) {
        return { success: false, message: 'Document not found' };
      }

      // Check if new path conflicts with existing documents
      const conflictingDoc = this.checkPathExists.get(data.new_path, userId);
      if (conflictingDoc && (conflictingDoc as any).id !== documentId) {
        return { success: false, message: 'A document with this path already exists' };
      }

      // Validate new parent if provided
      if (data.new_parent_id) {
        const parent = this.getDocumentById.get(data.new_parent_id, userId) as Document | undefined;
        if (!parent || !parent.is_directory) {
          return { success: false, message: 'Invalid parent directory' };
        }
      }

      this.moveDocumentStmt.run(
        data.new_path,
        data.new_parent_id || null,
        documentId,
        userId
      );

      const updatedDocument = this.getDocumentById.get(documentId, userId) as Document;
      return { success: true, message: 'Document moved successfully', document: updatedDocument };
    } catch (error) {
      console.error('Move document error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static getDocuments(userId: number): { success: boolean; message: string; documents?: Document[] } {
    try {
      const documents = this.getDocumentsByUserId.all(userId) as Document[];
      return { success: true, message: 'Documents retrieved successfully', documents };
    } catch (error) {
      console.error('Get documents error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static getFileTree(userId: number): { success: boolean; message: string; tree?: FileTreeNode[] } {
    try {
      const allDocuments = this.getDocumentsByUserId.all(userId) as Document[];
      
      // Build tree structure
      const documentMap = new Map<string, FileTreeNode>();
      const rootNodes: FileTreeNode[] = [];

      // First pass: create all nodes
      allDocuments.forEach(doc => {
        const node: FileTreeNode = {
          id: doc.id,
          title: doc.title,
          path: doc.path,
          is_directory: doc.is_directory,
          parent_id: doc.parent_id
        };
        if (doc.is_directory) {
          node.children = [];
        }
        documentMap.set(doc.id, node);
      });

      // Second pass: build parent-child relationships
      allDocuments.forEach(doc => {
        const node = documentMap.get(doc.id)!;
        if (doc.parent_id) {
          const parent = documentMap.get(doc.parent_id);
          if (parent && parent.children) {
            parent.children.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      });

      // Sort children in each directory
      const sortNodes = (nodes: FileTreeNode[]) => {
        nodes.sort((a, b) => {
          // Directories first, then files
          if (a.is_directory && !b.is_directory) return -1;
          if (!a.is_directory && b.is_directory) return 1;
          // Then alphabetically by title
          return a.title.localeCompare(b.title);
        });
        
        nodes.forEach(node => {
          if (node.children) {
            sortNodes(node.children);
          }
        });
      };

      sortNodes(rootNodes);

      return { success: true, message: 'File tree retrieved successfully', tree: rootNodes };
    } catch (error) {
      console.error('Get file tree error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }
}