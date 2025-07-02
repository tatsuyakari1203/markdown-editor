import { randomUUID } from 'crypto';
import { db } from '../database/connection.js';
import type { Document, DocumentRequest, CreateDirectoryRequest, MoveDocumentRequest, FileTreeNode, SearchRequest, SearchResponse, UserSettings, UpdateSettingsRequest, MediaFile } from '../types/index.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
  
  // Search prepared statements
  private static searchDocumentsStmt = db.prepare(`
    SELECT d.* FROM documents d
    JOIN documents_fts fts ON d.rowid = fts.rowid
    WHERE documents_fts MATCH ? AND d.user_id = ? AND d.is_directory = FALSE
    ORDER BY rank
    LIMIT ? OFFSET ?
  `);
  private static countSearchResultsStmt = db.prepare(`
    SELECT COUNT(*) as total FROM documents d
    JOIN documents_fts fts ON d.rowid = fts.rowid
    WHERE documents_fts MATCH ? AND d.user_id = ? AND d.is_directory = FALSE
  `);
  private static getRecentDocumentsStmt = db.prepare(`
    SELECT * FROM documents 
    WHERE user_id = ? AND is_directory = FALSE 
    ORDER BY updated_at DESC 
    LIMIT ?
  `);
  
  // Settings prepared statements
  private static getUserSettingsStmt = db.prepare('SELECT * FROM user_settings WHERE user_id = ?');
  private static insertUserSettingsStmt = db.prepare(`
    INSERT INTO user_settings (user_id, theme, editor_font_size, editor_font_family, auto_save, vim_mode, line_numbers, word_wrap)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  private static updateUserSettingsStmt = db.prepare(`
    UPDATE user_settings SET 
      theme = COALESCE(?, theme),
      editor_font_size = COALESCE(?, editor_font_size),
      editor_font_family = COALESCE(?, editor_font_family),
      auto_save = COALESCE(?, auto_save),
      vim_mode = COALESCE(?, vim_mode),
      line_numbers = COALESCE(?, line_numbers),
      word_wrap = COALESCE(?, word_wrap),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);
  
  // Media files prepared statements
  private static getMediaFileStmt = db.prepare('SELECT * FROM media_files WHERE id = ? AND user_id = ?');
  private static insertMediaFileStmt = db.prepare(`
    INSERT INTO media_files (id, user_id, filename, original_name, file_path, file_size, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  private static getUserMediaFilesStmt = db.prepare(`
    SELECT * FROM media_files WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `);
  private static deleteMediaFileStmt = db.prepare('DELETE FROM media_files WHERE id = ? AND user_id = ?');

  static createDocument(userId: number, data: DocumentRequest): { success: boolean; message: string; document?: Document } {
    try {
      console.log('Creating document with data:', { userId, data });
      
      // Generate path from folderPath and title
      const folderPath = data.folderPath || '/';
      const fileName = data.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase() + '.md';
      const fullPath = folderPath === '/' ? `/${fileName}` : `${folderPath}/${fileName}`;
      
      // Check if path already exists
      const existingDoc = this.checkPathExists.get(fullPath, userId);
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
        path: fullPath,
        is_directory: false,
        parent_id: data.parent_id || null
      });
      
      this.insertDocument.run(
        documentId,
        userId,
        data.title,
        data.content,
        fullPath,
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
      // Generate path from folderPath and title
      const folderPath = data.folderPath || '/';
      const dirName = data.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
      const fullPath = folderPath === '/' ? `/${dirName}` : `${folderPath}/${dirName}`;
      
      // Check if path already exists
      const existingDoc = this.checkPathExists.get(fullPath, userId);
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
        fullPath,
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

      // Handle folderPath to path conversion
      let newPath = existingDoc.path;
      if (data.folderPath !== undefined) {
        // Convert folderPath to full path
        const title = data.title ?? existingDoc.title;
        newPath = data.folderPath === '/' ? `/${title}` : `${data.folderPath}/${title}`;
      }

      // Check if new path conflicts with existing documents (if path is being changed)
      if (newPath !== existingDoc.path) {
        const conflictingDoc = this.checkPathExists.get(newPath, userId);
        if (conflictingDoc) {
          return { success: false, message: 'A document with this path already exists' };
        }
      }

      const updatedData = {
        title: data.title ?? existingDoc.title,
        content: data.content ?? existingDoc.content,
        path: newPath
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

  static getDocuments(userId: number, options?: { folder_path?: string; limit?: number; offset?: number }): { success: boolean; message: string; documents?: Document[] } {
    try {
      let documents: Document[];
      
      if (options?.folder_path) {
        // Filter by folder path
        const allDocuments = this.getDocumentsByUserId.all(userId) as Document[];
        documents = allDocuments.filter(doc => 
          doc.path.startsWith(options.folder_path!) && 
          doc.path !== options.folder_path
        );
      } else {
        documents = this.getDocumentsByUserId.all(userId) as Document[];
      }
      
      // Apply pagination
      if (options?.limit || options?.offset) {
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        documents = documents.slice(offset, offset + limit);
      }
      return { success: true, message: 'Documents retrieved successfully', documents };
    } catch (error) {
      console.error('Get documents error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static getFileTree(userId: number, path?: string, depth?: number): { success: boolean; message: string; tree?: FileTreeNode[] } {
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

      // Filter by path and depth if specified
      let filteredTree = rootNodes;
      if (path && path !== '/') {
        // Find the specific path node
        const findNodeByPath = (nodes: FileTreeNode[], targetPath: string): FileTreeNode | null => {
          for (const node of nodes) {
            if (node.path === targetPath) return node;
            if (node.children) {
              const found = findNodeByPath(node.children, targetPath);
              if (found) return found;
            }
          }
          return null;
        };
        const pathNode = findNodeByPath(rootNodes, path);
        filteredTree = pathNode ? (pathNode.children || []) : [];
      }
      
      // Apply depth limit if specified
      if (depth !== undefined && depth > 0) {
        const limitDepth = (nodes: FileTreeNode[], currentDepth: number): FileTreeNode[] => {
            if (currentDepth >= depth) return [];
            return nodes.map(node => {
              const result: FileTreeNode = {
                ...node
              };
              if (node.children) {
                result.children = limitDepth(node.children, currentDepth + 1);
              } else if (node.is_directory) {
                result.children = [];
              }
              return result;
            });
          };
        filteredTree = limitDepth(filteredTree, 0);
      }

      return { success: true, message: 'File tree retrieved successfully', tree: filteredTree };
    } catch (error) {
      console.error('Get file tree error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static createFolder(userId: number, path: string, name: string): { success: boolean; message: string; folder?: Document } {
    try {
      // Validate folder name
      if (!name || name.trim() === '') {
        return { success: false, message: 'Folder name is required' };
      }

      // Clean folder name
      const cleanName = name.trim();
      const folderPath = path === '/' ? `/${cleanName}` : `${path}/${cleanName}`;

      // Check if folder already exists
      const existing = this.checkPathExists.get(folderPath, userId);
      if (existing) {
        return { success: false, message: 'Folder already exists' };
      }

      // Find parent folder
      let parentId = null;
      if (path !== '/') {
        const parent = this.checkPathExists.get(path, userId) as { id: string } | undefined;
        if (!parent) {
          return { success: false, message: 'Parent directory not found' };
        }
        parentId = parent.id;
      }

      // Generate ID and create folder
      const folderId = crypto.randomUUID();
      this.insertDocument.run(folderId, userId, cleanName, '', folderPath, 1, parentId);

      const folder = this.getDocumentById.get(folderId, userId) as Document;
      return { success: true, message: 'Folder created successfully', folder };
    } catch (error) {
      console.error('Create folder error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static moveFile(userId: number, fromPath: string, toPath: string): { success: boolean; message: string } {
    try {
      // Find source document
      const sourceDoc = this.checkPathExists.get(fromPath, userId) as { id: string } | undefined;
      if (!sourceDoc) {
        return { success: false, message: 'Source file or folder not found' };
      }

      // Check if destination already exists
      const existing = this.checkPathExists.get(toPath, userId);
      if (existing) {
        return { success: false, message: 'Destination already exists' };
      }

      // Find new parent
      let newParentId = null;
      const parentPath = toPath.substring(0, toPath.lastIndexOf('/')) || '/';
      if (parentPath !== '/') {
        const parent = this.checkPathExists.get(parentPath, userId) as { id: string } | undefined;
        if (!parent) {
          return { success: false, message: 'Destination parent directory not found' };
        }
        newParentId = parent.id;
      }

      // Move the document
      this.moveDocumentStmt.run(toPath, newParentId, sourceDoc.id, userId);

      // If it's a directory, update all child paths
      const doc = this.getDocumentById.get(sourceDoc.id, userId) as Document;
      if (doc.is_directory) {
        this.updateChildPaths(sourceDoc.id, userId, fromPath, toPath);
      }

      return { success: true, message: 'File moved successfully' };
    } catch (error) {
      console.error('Move file error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  static deleteFile(userId: number, path: string): { success: boolean; message: string } {
    try {
      // Find document
      const doc = this.checkPathExists.get(path, userId) as { id: string } | undefined;
      if (!doc) {
        return { success: false, message: 'File or folder not found' };
      }

      // If it's a directory, delete all children first
      const document = this.getDocumentById.get(doc.id, userId) as Document;
      if (document.is_directory) {
        this.deleteChildDocuments(doc.id, userId);
      }

      // Delete the document
      this.deleteDocumentStmt.run(doc.id, userId);

      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Delete file error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  private static updateChildPaths(parentId: string, userId: number, oldParentPath: string, newParentPath: string) {
    const children = this.getChildDocuments.all(parentId, userId) as Document[];
    
    for (const child of children) {
      const newChildPath = child.path.replace(oldParentPath, newParentPath);
      this.moveDocumentStmt.run(newChildPath, parentId, child.id, userId);
      
      if (child.is_directory) {
        this.updateChildPaths(child.id, userId, child.path, newChildPath);
      }
    }
  }

  private static deleteChildDocuments(parentId: string, userId: number) {
    const children = this.getChildDocuments.all(parentId, userId) as Document[];
    
    for (const child of children) {
      if (child.is_directory) {
        this.deleteChildDocuments(child.id, userId);
      }
      this.deleteDocumentStmt.run(child.id, userId);
    }
  }

  // Search methods
  static searchDocuments(userId: number, searchData: SearchRequest): { success: boolean; message: string; result?: SearchResponse } {
    try {
      const { query, limit = 20, offset = 0 } = searchData;
      
      // Prepare FTS query
      const ftsQuery = query.split(' ').map(term => `"${term.replace(/"/g, '')}"*`).join(' OR ');
      
      const documents = this.searchDocumentsStmt.all(ftsQuery, userId, limit, offset) as Document[];
      const countResult = this.countSearchResultsStmt.get(ftsQuery, userId) as { total: number };
      
      return {
        success: true,
        message: 'Search completed successfully',
        result: {
          data: {
            documents,
            total: countResult.total,
            hasMore: (offset + documents.length) < countResult.total
          }
        }
      };
    } catch (error) {
      console.error('Search documents error:', error);
      return { success: false, message: 'Search failed' };
    }
  }

  static getRecentDocuments(userId: number, limit: number = 10): { success: boolean; message: string; documents?: Document[] } {
    try {
      const documents = this.getRecentDocumentsStmt.all(userId, limit) as Document[];
      return { success: true, message: 'Recent documents retrieved successfully', documents };
    } catch (error) {
      console.error('Get recent documents error:', error);
      return { success: false, message: 'Failed to get recent documents' };
    }
  }

  // Settings methods
  static getUserSettings(userId: number): { success: boolean; message: string; settings?: UserSettings } {
    try {
      let settings = this.getUserSettingsStmt.get(userId) as UserSettings | undefined;
      
      // Create default settings if none exist
      if (!settings) {
        this.insertUserSettingsStmt.run(
          userId,
          'auto', // theme
          14, // editor_font_size
          'Monaco, Consolas, monospace', // editor_font_family
          true, // auto_save
          false, // vim_mode
          true, // line_numbers
          true // word_wrap
        );
        settings = this.getUserSettingsStmt.get(userId) as UserSettings;
      }
      
      return { success: true, message: 'Settings retrieved successfully', settings };
    } catch (error) {
      console.error('Get user settings error:', error);
      return { success: false, message: 'Failed to get user settings' };
    }
  }

  static updateUserSettings(userId: number, updates: UpdateSettingsRequest): { success: boolean; message: string; settings?: UserSettings } {
    try {
      // Ensure user has settings record
      this.getUserSettings(userId);
      
      this.updateUserSettingsStmt.run(
        updates.theme || null,
        updates.editor_font_size || null,
        updates.editor_font_family || null,
        updates.auto_save !== undefined ? updates.auto_save : null,
        updates.vim_mode !== undefined ? updates.vim_mode : null,
        updates.line_numbers !== undefined ? updates.line_numbers : null,
        updates.word_wrap !== undefined ? updates.word_wrap : null,
        userId
      );
      
      const settings = this.getUserSettingsStmt.get(userId) as UserSettings;
      return { success: true, message: 'Settings updated successfully', settings };
    } catch (error) {
      console.error('Update user settings error:', error);
      return { success: false, message: 'Failed to update settings' };
    }
  }

  // Media methods
  static uploadMediaFile(userId: number, file: { originalName: string; buffer: Buffer; mimetype: string }): { success: boolean; message: string; file?: MediaFile } {
    try {
      const fileId = randomUUID();
      const fileExtension = path.extname(file.originalName);
      const filename = `${fileId}${fileExtension}`;
      const uploadDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadDir, filename);
      
      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);
      
      // Save to database
      this.insertMediaFileStmt.run(
        fileId,
        userId,
        filename,
        file.originalName,
        filePath,
        file.buffer.length,
        file.mimetype
      );
      
      const mediaFile = this.getMediaFileStmt.get(fileId, userId) as MediaFile;
      return { success: true, message: 'File uploaded successfully', file: mediaFile };
    } catch (error) {
      console.error('Upload media file error:', error);
      return { success: false, message: 'Failed to upload file' };
    }
  }

  static getMediaFile(userId: number, fileId: string): { success: boolean; message: string; file?: MediaFile } {
    try {
      const file = this.getMediaFileStmt.get(fileId, userId) as MediaFile | undefined;
      if (!file) {
        return { success: false, message: 'File not found' };
      }
      return { success: true, message: 'File retrieved successfully', file };
    } catch (error) {
      console.error('Get media file error:', error);
      return { success: false, message: 'Failed to get file' };
    }
  }

  static getUserMediaFiles(userId: number, limit: number = 20, offset: number = 0): { success: boolean; message: string; files?: MediaFile[] } {
    try {
      const files = this.getUserMediaFilesStmt.all(userId, limit, offset) as MediaFile[];
      return { success: true, message: 'Media files retrieved successfully', files };
    } catch (error) {
      console.error('Get user media files error:', error);
      return { success: false, message: 'Failed to get media files' };
    }
  }

  static deleteMediaFile(userId: number, fileId: string): { success: boolean; message: string } {
    try {
      const file = this.getMediaFileStmt.get(fileId, userId) as MediaFile | undefined;
      if (!file) {
        return { success: false, message: 'File not found' };
      }
      
      // Delete from filesystem
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }
      
      // Delete from database
      this.deleteMediaFileStmt.run(fileId, userId);
      
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Delete media file error:', error);
      return { success: false, message: 'Failed to delete file' };
    }
  }
}