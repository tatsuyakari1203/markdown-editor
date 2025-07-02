import type { FastifyInstance } from 'fastify';
import { UserService } from '../services/userService.js';
import type { LoginRequest, RegisterRequest } from '../types/index.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post<{
    Body: RegisterRequest;
  }>('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          password: { type: 'string', minLength: 6, maxLength: 100 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await UserService.register(request.body);
      
      if (!result.success) {
        return reply.status(400).send({
          error: 'Registration Failed',
          message: result.message,
          statusCode: 400
        });
      }

      reply.status(201).send({
        success: true,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      console.error('Register route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Registration failed',
        statusCode: 500
      });
    }
  });

  // Login
  fastify.post<{
    Body: LoginRequest;
  }>('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await UserService.login(request.body);
      
      if (!result.success) {
        return reply.status(401).send({
          error: 'Login Failed',
          message: result.message,
          statusCode: 401
        });
      }

      // Set session cookie for backward compatibility
      reply.setCookie('sessionId', result.sessionId!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      reply.send({
        success: true,
        data: {
          user: result.user,
          session: {
            token: result.sessionId!,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Login route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Login failed',
        statusCode: 500
      });
    }
  });

  // Logout
  fastify.post('/logout', {
    preHandler: [fastify.authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const sessionId = request.cookies.sessionId;
      
      if (sessionId) {
        UserService.logout(sessionId);
      }

      // Clear session cookie
      reply.clearCookie('sessionId', {
        path: '/'
      });

      reply.send({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Logout failed',
        statusCode: 500
      });
    }
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      reply.send({
        success: true,
        data: {
          user: {
            ...request.user!,
            createdAt: new Date().toISOString() // TODO: Get actual createdAt from database
          }
        }
      });
    } catch (error) {
      console.error('Get user route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get user information',
        statusCode: 500
      });
    }
  });

  // Check authentication status
  fastify.get('/status', {
    preHandler: [fastify.optionalAuthMiddleware]
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      reply.send({
        authenticated: !!request.user,
        user: request.user || null
      });
    } catch (error) {
      console.error('Auth status route error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to check authentication status',
        statusCode: 500
      });
    }
  });
}