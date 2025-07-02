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
    // Get session ID from cookie
    const sessionId = request.cookies.sessionId;
    
    if (!sessionId) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'No session found',
        statusCode: 401
      });
      return;
    }

    // Validate session
    const sessionResult = UserService.validateSession(sessionId);
    
    if (!sessionResult.valid || !sessionResult.user) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired session',
        statusCode: 401
      });
      return;
    }

    // Attach user to request
    request.user = sessionResult.user;
  } catch (error) {
    console.error('Auth middleware error:', error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
      statusCode: 500
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