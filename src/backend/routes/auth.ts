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
      summary: 'User Registration',
      description: 'Creates a new user account.',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { 
            type: 'string', 
            minLength: 3, 
            maxLength: 50,
            description: 'Username for the new account (3-50 characters)'
          },
          password: { 
            type: 'string', 
            minLength: 6, 
            maxLength: 100,
            format: 'password',
            description: 'Password for the new account (6-100 characters)'
          }
        }
      },
      response: {
        201: {
          description: 'User successfully created',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error or username already exists',
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
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
  }, async (request, reply) => {
    try {
      const result = await UserService.register(request.body);
      
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
          user: result.user
        }
      });
    } catch (error) {
      console.error('Register route error:', error);
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed'
        }
      });
    }
  });

  // Login
  fastify.post<{
    Body: LoginRequest;
  }>('/login', {
    schema: {
      summary: 'User Login',
      description: 'Logs in a user and returns a session token.',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', description: 'The username to log in with.' },
          password: { type: 'string', format: 'password', description: 'The user\'s password.' }
        }
      },
      response: {
        200: {
          description: 'Successful login response',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' }
                  }
                },
                session: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    expiresAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Invalid credentials',
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
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
  }, async (request, reply) => {
    try {
      const result = await UserService.login(request.body);
      
      if (!result.success) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: result.message
          }
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
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        }
      });
    }
  });

  // Logout
  fastify.post('/logout', {
    schema: {
      summary: 'User Logout',
      description: 'Logs out the current user and invalidates the session.',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Successful logout',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
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
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed'
        }
      });
    }
  });

  // Get current user
  fastify.get('/me', {
    schema: {
      summary: 'Get Current User',
      description: 'Returns information about the currently authenticated user.',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Current user information',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
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
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user information'
        }
      });
    }
  });

  // Check authentication status
  fastify.get('/status', {
    schema: {
      summary: 'Check Authentication Status',
      description: 'Checks if the user is currently authenticated.',
      tags: ['auth'],
      response: {
        200: {
          description: 'Authentication status',
          type: 'object',
          properties: {
            authenticated: { type: 'boolean' },
            user: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' }
                  }
                },
                { type: 'null' }
              ]
            }
          }
        }
      }
    },
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
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check authentication status'
        }
      });
    }
  });
}