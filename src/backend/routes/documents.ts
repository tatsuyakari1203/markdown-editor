import type { FastifyInstance } from 'fastify';
import { DocumentService } from '../services/documentService.js';
import type { DocumentRequest, CreateDirectoryRequest, MoveDocumentRequest } from '../types/index.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function documentRoutes(fastify: FastifyInstance) {
  // Get all documents for user
  fastify.get('/documents', {
    preHandler: [fastify.authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.getDocuments(request.user!.id);
      
      if (!result.success) {
        return reply.status(400).send({
          error: 'Failed to get documents',
          message: result.message,
          statusCode: 400
        });
      }

      reply.send({
        success: true,
        documents: result.documents
      });
    } catch (error) {
      console.error('Get documents route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve documents',
        statusCode: 500
      });
    }
  });

  // Get file tree
  fastify.get('/documents/tree', {
    preHandler: [fastify.authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.getFileTree(request.user!.id);
      
      if (!result.success) {
        return reply.status(400).send({
          error: 'Failed to get file tree',
          message: result.message,
          statusCode: 400
        });
      }

      reply.send({
        success: true,
        tree: result.tree
      });
    } catch (error) {
      console.error('Get file tree route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve file tree',
        statusCode: 500
      });
    }
  });

  // Get specific document
  fastify.get<{
    Params: { id: string };
  }>('/documents/:id', {
    preHandler: [fastify.authMiddleware],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.getDocument(request.user!.id, (request.params as { id: string }).id);
      
      if (!result.success) {
        const statusCode = result.message === 'Document not found' ? 404 : 400;
        return reply.status(statusCode).send({
          error: 'Failed to get document',
          message: result.message,
          statusCode
        });
      }

      reply.send({
        success: true,
        document: result.document
      });
    } catch (error) {
      console.error('Get document route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve document',
        statusCode: 500
      });
    }
  });

  // Create document
  fastify.post<{
    Body: DocumentRequest;
  }>('/documents', {
    preHandler: [fastify.authMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'content', 'path'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          content: { type: 'string' },
          path: { type: 'string', minLength: 1 },
          parent_id: { type: 'string' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.createDocument(request.user!.id, request.body as DocumentRequest);
      
      if (!result.success) {
        return reply.status(400).send({
          error: 'Failed to create document',
          message: result.message,
          statusCode: 400
        });
      }

      reply.status(201).send({
        success: true,
        message: result.message,
        document: result.document
      });
    } catch (error) {
      console.error('Create document route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create document',
        statusCode: 500
      });
    }
  });

  // Create directory
  fastify.post<{
    Body: CreateDirectoryRequest;
  }>('/documents/directories', {
    preHandler: [fastify.authMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'path'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          path: { type: 'string', minLength: 1 },
          parent_id: { type: 'string' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.createDirectory(request.user!.id, request.body as CreateDirectoryRequest);
      
      if (!result.success) {
        return reply.status(400).send({
          error: 'Failed to create directory',
          message: result.message,
          statusCode: 400
        });
      }

      reply.status(201).send({
        success: true,
        message: result.message,
        document: result.document
      });
    } catch (error) {
      console.error('Create directory route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create directory',
        statusCode: 500
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
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          content: { type: 'string' },
          path: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.updateDocument(request.user!.id, (request.params as { id: string }).id, request.body as Partial<DocumentRequest>);
      
      if (!result.success) {
        const statusCode = result.message === 'Document not found' ? 404 : 400;
        return reply.status(statusCode).send({
          error: 'Failed to update document',
          message: result.message,
          statusCode
        });
      }

      reply.send({
        success: true,
        message: result.message,
        document: result.document
      });
    } catch (error) {
      console.error('Update document route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update document',
        statusCode: 500
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
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['new_path'],
        properties: {
          new_path: { type: 'string', minLength: 1 },
          new_parent_id: { type: 'string' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.moveDocument(request.user!.id, (request.params as { id: string }).id, request.body as MoveDocumentRequest);
      
      if (!result.success) {
        const statusCode = result.message === 'Document not found' ? 404 : 400;
        return reply.status(statusCode).send({
          error: 'Failed to move document',
          message: result.message,
          statusCode
        });
      }

      reply.send({
        success: true,
        message: result.message,
        document: result.document
      });
    } catch (error) {
      console.error('Move document route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to move document',
        statusCode: 500
      });
    }
  });

  // Delete document
  fastify.delete<{
    Params: { id: string };
  }>('/documents/:id', {
    preHandler: [fastify.authMiddleware],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = DocumentService.deleteDocument(request.user!.id, (request.params as { id: string }).id);
      
      if (!result.success) {
        const statusCode = result.message === 'Document not found' ? 404 : 400;
        return reply.status(statusCode).send({
          error: 'Failed to delete document',
          message: result.message,
          statusCode
        });
      }

      reply.send({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete document route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete document',
        statusCode: 500
      });
    }
  });
}