import type { FastifyInstance } from 'fastify';
import { DocumentService } from '../services/documentService.js';
import type { DocumentRequest, CreateDirectoryRequest, MoveDocumentRequest, SearchRequest, UpdateSettingsRequest, OCRRequest } from '../types/index.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function documentRoutes(fastify: FastifyInstance) {
  // Get all documents
  fastify.get<{
    Querystring: {
      folder_path?: string;
      limit?: number;
      offset?: number;
    };
  }>('/documents', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Get Documents',
      description: 'Retrieves a list of documents for the authenticated user with optional filtering and pagination.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          folder_path: { type: 'string', description: 'Filter documents by folder path' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50, description: 'Maximum number of documents to return' },
          offset: { type: 'number', minimum: 0, default: 0, description: 'Number of documents to skip for pagination' }
        }
      },
      response: {
        200: {
          description: 'List of documents retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                documents: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                      folder_path: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' },
                      updated_at: { type: 'string', format: 'date-time' }
                    }
                  }
                },
                total: { type: 'number' },
                hasMore: { type: 'boolean' }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { folder_path, limit = 50, offset = 0 } = request.query as { folder_path?: string; limit?: number; offset?: number };
       const options: { folder_path?: string; limit?: number; offset?: number } = {};
       if (folder_path !== undefined) options.folder_path = folder_path;
       if (limit !== undefined) options.limit = limit;
       if (offset !== undefined) options.offset = offset;
       const result = DocumentService.getDocuments(request.user!.id, options);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      const total = result.documents?.length || 0;
      const hasMore = limit && offset !== undefined ? (offset + limit < total) : false;
      
      reply.send({
        success: true,
        data: {
          documents: result.documents || [],
          total: total,
          hasMore: hasMore
        }
      });
    } catch (error) {
      console.error('Get documents route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve documents'
        }
      });
    }
  });

  // Get file tree
  fastify.get('/documents/tree', {
    schema: {
      summary: 'Get File Tree',
      description: 'Retrieves the hierarchical file tree structure for the authenticated user.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'File tree retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tree: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['file', 'folder'] },
                  path: { type: 'string' },
                  children: {
                    type: 'array',
                    items: { $ref: '#' }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: [fastify.authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.getFileTree(request.user!.id);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        tree: result.tree
      });
    } catch (error) {
      console.error('Get file tree route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve file tree'
        }
      });
    }
  });

  // Get specific document
  fastify.get<{
    Params: { id: string };
  }>('/documents/:id', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Get Document by ID',
      description: 'Retrieves a specific document by its ID for the authenticated user.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Document ID' }
        }
      },
      response: {
        200: {
          description: 'Document retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                document: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    folder_path: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Document not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.getDocument(request.user!.id, (request.params as { id: string }).id);
      
      if (!result.success) {
        const statusCode = result.message === 'Document not found' ? 404 : 400;
        const errorCode = result.message === 'Document not found' ? 'DOCUMENT_NOT_FOUND' : 'VALIDATION_ERROR';
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: errorCode,
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        data: {
          document: result.document
        }
      });
    } catch (error) {
      console.error('Get document route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve document'
        }
      });
    }
  });

  // Create document
  fastify.post<{
    Body: DocumentRequest;
  }>('/documents', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Create Document',
      description: 'Creates a new document for the authenticated user.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255, description: 'Document title' },
          content: { type: 'string', description: 'Document content in markdown format' },
          folderPath: { type: 'string', description: 'Folder path where the document should be created' },
          parent_id: { type: 'string', description: 'Parent folder ID' }
        }
      },
      response: {
        201: {
          description: 'Document created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                document: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    folder_path: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.createDocument(request.user!.id, request.body as DocumentRequest);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.status(201).send({
        success: true,
        data: {
          document: result.document
        }
      });
    } catch (error) {
      console.error('Create document route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create document'
        }
      });
    }
  });

  // Create directory
  fastify.post<{
    Body: CreateDirectoryRequest;
  }>('/documents/directories', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Create Directory',
      description: 'Creates a new directory/folder for organizing documents.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255, description: 'Directory name' },
          folderPath: { type: 'string', description: 'Parent folder path' },
          parent_id: { type: 'string', description: 'Parent directory ID' }
        }
      },
      response: {
        201: {
          description: 'Directory created successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                directory: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    folder_path: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        500: {
          description: 'Internal server error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.createDirectory(request.user!.id, request.body as CreateDirectoryRequest);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.status(201).send({
        success: true,
        data: {
          document: result.document
        }
      });
    } catch (error) {
      console.error('Create directory route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create directory'
        }
      });
    }
  });

  // Update document
  fastify.put<{
    Params: { id: string };
    Body: Partial<DocumentRequest>;
  }>('/documents/:id', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Update Document',
      description: 'Update an existing document by ID with new title, content, or folder path.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Document ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255, description: 'Document title' },
          content: { type: 'string', description: 'Document content in Markdown format' },
          folderPath: { type: 'string', minLength: 1, description: 'Folder path for the document' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                document: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    folderPath: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'DOCUMENT_NOT_FOUND' },
                message: { type: 'string', example: 'Document not found' }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INTERNAL_ERROR' },
                message: { type: 'string', example: 'Failed to update document' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.updateDocument(request.user!.id, (request.params as { id: string }).id, request.body as Partial<DocumentRequest>);
      
      if (!result.success) {
        const statusCode = result.message === 'Document not found' ? 404 : 400;
        const errorCode = result.message === 'Document not found' ? 'DOCUMENT_NOT_FOUND' : 'VALIDATION_ERROR';
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: errorCode,
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        data: {
          document: result.document
        }
      });
    } catch (error) {
      console.error('Update document route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update document'
        }
      });
    }
  });

  // Move document
  fastify.patch<{
    Params: { id: string };
    Body: MoveDocumentRequest;
  }>('/documents/:id/move', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Move Document',
      description: 'Move a document to a different location or folder.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Document ID to move' }
        }
      },
      body: {
        type: 'object',
        required: ['new_path'],
        properties: {
          new_path: { type: 'string', minLength: 1, description: 'New path for the document' },
          new_parent_id: { type: 'string', description: 'New parent directory ID' }
        }
      },
      response: {
        200: {
          description: 'Document moved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                document: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    folder_path: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        404: {
          description: 'Document not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        500: {
          description: 'Internal server error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.moveDocument(request.user!.id, (request.params as { id: string }).id, request.body as MoveDocumentRequest);
      
      if (!result.success) {
        const statusCode = result.message === 'Document not found' ? 404 : 400;
        const errorCode = result.message === 'Document not found' ? 'DOCUMENT_NOT_FOUND' : 'VALIDATION_ERROR';
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: errorCode,
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        data: {
          document: result.document
        }
      });
    } catch (error) {
      console.error('Move document route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to move document'
        }
      });
    }
  });

  // Delete document
  fastify.delete<{
    Params: { id: string };
  }>('/documents/:id', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Delete Document',
      description: 'Delete a document by ID. This will permanently remove the document and all its content.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Document ID to delete' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Document deleted successfully' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'DOCUMENT_NOT_FOUND' },
                message: { type: 'string', example: 'Document not found' }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INTERNAL_ERROR' },
                message: { type: 'string', example: 'Failed to delete document' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.deleteDocument(request.user!.id, (request.params as { id: string }).id);
      
      if (!result.success) {
        const statusCode = result.message === 'Document not found' ? 404 : 400;
        const errorCode = result.message === 'Document not found' ? 'DOCUMENT_NOT_FOUND' : 'VALIDATION_ERROR';
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: errorCode,
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete document route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete document'
        }
      });
    }
  });

  // Search documents
  fastify.post('/documents/search', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Search Documents',
      description: 'Search for documents based on a query string with optional pagination.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Search query string' },
          limit: { type: 'number', description: 'Maximum number of results to return' },
          offset: { type: 'number', description: 'Number of results to skip for pagination' }
        }
      },
      response: {
        200: {
          description: 'Search results',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  content: { type: 'string' },
                  folder_path: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            total: { type: 'number' }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const searchData = request.body as SearchRequest;
      const result = DocumentService.searchDocuments(request.user!.id, searchData);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        ...result.result
      });
    } catch (error) {
      console.error('Search documents route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Search failed'
        }
      });
    }
  });

  // Get recent documents
  fastify.get('/documents/recent', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Get Recent Documents',
      description: 'Retrieve the most recently accessed documents for the authenticated user.',
      tags: ['documents'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10, description: 'Maximum number of recent documents to return' }
        }
      },
      response: {
        200: {
          description: 'Recent documents retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  content: { type: 'string' },
                  folder_path: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { limit = 10 } = request.query as { limit?: number };
      const result = DocumentService.getRecentDocuments(request.user!.id, limit);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        documents: result.documents
      });
    } catch (error) {
      console.error('Get recent documents route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get recent documents'
        }
      });
    }
  });

  // Get user settings
  fastify.get('/settings', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Get User Settings',
      description: 'Retrieve the current user settings for the authenticated user.',
      tags: ['settings'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'User settings retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            settings: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                language: { type: 'string' },
                auto_save: { type: 'boolean' },
                font_size: { type: 'number' }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.getUserSettings(request.user!.id);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        settings: result.settings
      });
    } catch (error) {
      console.error('Get settings route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get settings'
        }
      });
    }
  });

  // Update user settings
  fastify.put('/settings', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Update User Settings',
      description: 'Update user preferences and settings for the authenticated user.',
      tags: ['settings'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark', 'auto'], description: 'UI theme preference' },
          editor_font_size: { type: 'number', description: 'Font size for the editor' },
          editor_font_family: { type: 'string', description: 'Font family for the editor' },
          auto_save: { type: 'boolean', description: 'Enable automatic saving' },
          vim_mode: { type: 'boolean', description: 'Enable Vim key bindings' },
          line_numbers: { type: 'boolean', description: 'Show line numbers in editor' },
          word_wrap: { type: 'boolean', description: 'Enable word wrapping in editor' }
        }
      },
      response: {
        200: {
          description: 'Settings updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            settings: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                editor_font_size: { type: 'number' },
                editor_font_family: { type: 'string' },
                auto_save: { type: 'boolean' },
                vim_mode: { type: 'boolean' },
                line_numbers: { type: 'boolean' },
                word_wrap: { type: 'boolean' }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const updates = request.body as UpdateSettingsRequest;
      const result = DocumentService.updateUserSettings(request.user!.id, updates);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        settings: result.settings
      });
    } catch (error) {
      console.error('Update settings route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update settings'
        }
      });
    }
  });

  // Register multipart support
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // Upload media file
  fastify.post('/media/upload', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Upload Media File',
      description: 'Upload a media file (image or document) for use in documents.',
      tags: ['media'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          description: 'File uploaded successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            file: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                filename: { type: 'string' },
                original_name: { type: 'string' },
                mimetype: { type: 'string' },
                size: { type: 'number' },
                url: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        400: {
          description: 'Validation error or invalid file type',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please select a file to upload'
          }
        });
      }

      // Validate file type
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
      const extname = allowedTypes.test(data.filename.toLowerCase());
      const mimetype = allowedTypes.test(data.mimetype);
      
      if (!mimetype || !extname) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Only images and documents are allowed'
          }
        });
      }

      const buffer = await data.toBuffer();
      const result = DocumentService.uploadMediaFile(request.user!.id, {
        originalName: data.filename,
        buffer: buffer,
        mimetype: data.mimetype
      });
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        file: result.file
      });
    } catch (error) {
      console.error('Upload media route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Upload failed'
        }
      });
    }
  });

  // Get user media files
  fastify.get('/media', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Get Media Files',
      description: 'Retrieve a list of media files uploaded by the authenticated user with pagination.',
      tags: ['media'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20, description: 'Maximum number of files to return' },
          offset: { type: 'number', default: 0, description: 'Number of files to skip for pagination' }
        }
      },
      response: {
        200: {
          description: 'Media files retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  filename: { type: 'string' },
                  original_name: { type: 'string' },
                  mimetype: { type: 'string' },
                  size: { type: 'number' },
                  url: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            total: { type: 'number' }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };
      const result = DocumentService.getUserMediaFiles(request.user!.id, limit, offset);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        files: result.files
      });
    } catch (error) {
      console.error('Get media files route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get media files'
        }
      });
    }
  });

  // Get specific media file
  fastify.get('/media/:id', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Get Media File',
      description: 'Retrieve details of a specific media file by its ID.',
      tags: ['media'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Media file ID' }
        }
      },
      response: {
        200: {
          description: 'Media file details retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            file: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                filename: { type: 'string' },
                original_name: { type: 'string' },
                mimetype: { type: 'string' },
                size: { type: 'number' },
                url: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        404: {
          description: 'Media file not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = DocumentService.getMediaFile(request.user!.id, id);
      
      if (!result.success) {
        const statusCode = result.message === 'File not found' ? 404 : 400;
        const errorCode = result.message === 'File not found' ? 'FILE_NOT_FOUND' : 'VALIDATION_ERROR';
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: errorCode,
            message: result.message
          }
        });
      }

      // Serve the actual file
      const fs = await import('fs');
      if (fs.existsSync(result.file!.file_path)) {
        reply.type(result.file!.mime_type);
        return reply.send(fs.createReadStream(result.file!.file_path));
      } else {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'The requested file could not be found'
          }
        });
      }
    } catch (error) {
      console.error('Get media file route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get media file'
        }
      });
    }
  });

  // Delete media file
  fastify.delete('/media/:id', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'Delete Media File',
      description: 'Delete a specific media file by its ID.',
      tags: ['media'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Media file ID to delete' }
        }
      },
      response: {
        200: {
          description: 'Media file deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        404: {
          description: 'Media file not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = DocumentService.deleteMediaFile(request.user!.id, id);
      
      if (!result.success) {
        const statusCode = result.message === 'File not found' ? 404 : 400;
        const errorCode = result.message === 'File not found' ? 'FILE_NOT_FOUND' : 'VALIDATION_ERROR';
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: errorCode,
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete media file route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete media file'
        }
      });
    }
  });

  // OCR endpoint (placeholder - would need actual OCR service)
  fastify.post('/media/:id/ocr', {
    preHandler: [fastify.authMiddleware],
    schema: {
      summary: 'OCR Media File',
      description: 'Perform Optical Character Recognition (OCR) on a media file to extract text content.',
      tags: ['media'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Media file ID to perform OCR on' }
        }
      },
      body: {
        type: 'object',
        properties: {
          language: { type: 'string', default: 'eng', description: 'OCR language code (e.g., eng, vie, jpn)' }
        }
      },
      response: {
        200: {
          description: 'OCR completed successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            text: { type: 'string', description: 'Extracted text from the image' },
            confidence: { type: 'number', description: 'OCR confidence score' }
          }
        },
        404: {
          description: 'Media file not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { language = 'eng' } = request.body as OCRRequest;
      
      // Get the media file
      const fileResult = DocumentService.getMediaFile(request.user!.id, id);
      if (!fileResult.success) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: fileResult.message
          }
        });
      }

      // TODO: Implement actual OCR service integration
      // For now, return a placeholder response
      reply.send({
        success: true,
        text: 'OCR functionality not yet implemented. This would extract text from the uploaded image.',
        confidence: 0.95,
        message: 'OCR completed successfully'
      });
    } catch (error) {
      console.error('OCR route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'OCR processing failed',
        statusCode: 500
      });
    }
  });
}