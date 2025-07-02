import type { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/userService.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: number;
    username: string;
  };
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    let sessionId: string | undefined;
    
    // Check for Bearer token first (API docs requirement)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7);
    } else {
      // Fallback to cookie for backward compatibility
      sessionId = request.cookies.sessionId;
    }
    
    if (!sessionId) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No session found'
        }
      });
      return;
    }

    // Validate session
    const sessionResult = UserService.validateSession(sessionId);
    
    if (!sessionResult.valid || !sessionResult.user) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired session'
        }
      });
      return;
    }

    // Attach user to request
    request.user = sessionResult.user;
  } catch (error) {
    console.error('Auth middleware error:', error);
    reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      }
    });
  }
}

export async function optionalAuthMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const sessionId = request.cookies.sessionId;
    
    if (sessionId) {
      const sessionResult = UserService.validateSession(sessionId);
      if (sessionResult.valid && sessionResult.user) {
        request.user = sessionResult.user;
      }
    }
    // Don't throw error if no session - this is optional auth
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't throw error - this is optional auth
  }
}