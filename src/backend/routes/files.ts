import { FastifyInstance } from 'fastify';
import { DocumentService } from '../services/documentService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function filesRoutes(fastify: FastifyInstance) {
  // GET /api/files/tree - Lấy cấu trúc file tree
  fastify.get('/files/tree', {
    preHandler: [fastify.authMiddleware],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          path: { type: 'string', default: '/' },
          depth: { type: 'number' }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { path = '/', depth } = request.query as { path?: string; depth?: number };
      const result = DocumentService.getFileTree(request.user!.id, path, depth);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        data: {
          tree: result.tree
        }
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

  // POST /api/files/folder - Tạo folder mới
  fastify.post('/files/folder', {
    preHandler: [fastify.authMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['path', 'name'],
        properties: {
          path: { type: 'string', minLength: 1 },
          name: { type: 'string', minLength: 1, maxLength: 255 }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { path, name } = request.body as { path: string; name: string };
      const result = DocumentService.createFolder(request.user!.id, path, name);
      
      if (!result.success) {
        const statusCode = result.message.includes('already exists') ? 409 : 400;
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: result.message.includes('already exists') ? 'PATH_ALREADY_EXISTS' : 'INVALID_PATH',
            message: result.message
          }
        });
      }

      reply.status(201).send({
        success: true,
        data: {
          folder: {
            path: result.folder!.path,
            name: result.folder!.title,
            type: 'folder'
          }
        }
      });
    } catch (error) {
      console.error('Create folder route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create folder'
        }
      });
    }
  });

  // PUT /api/files/move - Di chuyển file hoặc folder
  fastify.put('/files/move', {
    preHandler: [fastify.authMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['fromPath', 'toPath'],
        properties: {
          fromPath: { type: 'string', minLength: 1 },
          toPath: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { fromPath, toPath } = request.body as { fromPath: string; toPath: string };
      const result = DocumentService.moveFile(request.user!.id, fromPath, toPath);
      
      if (!result.success) {
        const statusCode = result.message.includes('not found') ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: result.message.includes('not found') ? 'PATH_NOT_FOUND' : 'INVALID_PATH',
            message: result.message
          }
        });
      }

      reply.send({
        success: true,
        message: 'File moved successfully',
        data: {
          fromPath,
          toPath
        }
      });
    } catch (error) {
      console.error('Move file route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to move file'
        }
      });
    }
  });

  // DELETE /api/files - Xóa file hoặc folder
  fastify.delete('/files', {
    preHandler: [fastify.authMiddleware],
    schema: {
      querystring: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { path } = request.query as { path: string };
      const result = DocumentService.deleteFile(request.user!.id, path);
      
      if (!result.success) {
        const statusCode = result.message.includes('not found') ? 404 : 
                          result.message.includes('not empty') ? 409 : 400;
        const errorCode = result.message.includes('not found') ? 'PATH_NOT_FOUND' :
                         result.message.includes('not empty') ? 'FOLDER_NOT_EMPTY' : 'INVALID_PATH';
        
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
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Delete file route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete file'
        }
      });
    }
  });
}