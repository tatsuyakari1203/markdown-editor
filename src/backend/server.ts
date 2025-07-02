import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import cookie from '@fastify/cookie';
import { join } from 'path';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { documentRoutes } from './routes/documents.js';
import { filesRoutes } from './routes/files.js';
import { UserService } from './services/userService.js';
import { DatabaseConnection } from './database/connection.js';

// Extend Fastify instance with custom middleware
declare module 'fastify' {
  interface FastifyInstance {
    authMiddleware: typeof authMiddleware;
    optionalAuthMiddleware: typeof optionalAuthMiddleware;
  }
}

const loggerConfig: any = {
  level: process.env.LOG_LEVEL || 'info'
};

if (process.env.NODE_ENV === 'development') {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  };
}

const fastify = Fastify({
  logger: loggerConfig
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? ['http://localhost:5173', 'http://localhost:4173'] // Add your production domains
      : true,
    credentials: true
  });

  // Cookie support
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'your-secret-key-change-in-production',
    parseOptions: {}
  });

  // Static files (serve frontend in production)
  if (process.env.NODE_ENV === 'production') {
    await fastify.register(staticFiles, {
      root: join(process.cwd(), 'dist'),
      prefix: '/'
    });
  }
}

// Register middleware
function registerMiddleware() {
  fastify.decorate('authMiddleware', authMiddleware);
  fastify.decorate('optionalAuthMiddleware', optionalAuthMiddleware);
}

// Register routes
async function registerRoutes() {
  // API routes
  await fastify.register(async function (fastify) {
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(documentRoutes, { prefix: '/api' });
    await fastify.register(filesRoutes, { prefix: '/api' });
  });

  // Health check
  fastify.get('/api/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Serve frontend for all non-API routes in production
  if (process.env.NODE_ENV === 'production') {
    fastify.get('/*', async (request, reply) => {
      return reply.sendFile('index.html');
    });
  }
}

// Error handler
function registerErrorHandler() {
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    
    // Validation errors
    if (error.validation) {
      reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.validation,
        statusCode: 400
      });
      return;
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      statusCode
    });
  });
}

// Graceful shutdown
function setupGracefulShutdown() {
  const signals = ['SIGINT', 'SIGTERM'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      fastify.log.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        // Clean up expired sessions
        UserService.cleanupExpiredSessions();
        
        // Close database connection
        DatabaseConnection.close();
        
        // Close Fastify server
        await fastify.close();
        
        fastify.log.info('Server shut down successfully');
        process.exit(0);
      } catch (error) {
        fastify.log.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });
}

// Start server
async function start() {
  try {
    // Initialize database connection
    DatabaseConnection.getInstance();
    fastify.log.info('Database connected successfully');

    // Register everything
    await registerPlugins();
    registerMiddleware();
    await registerRoutes();
    registerErrorHandler();
    setupGracefulShutdown();

    // Start listening
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on http://${host}:${port}`);
    
    // Clean up expired sessions periodically
    setInterval(() => {
      UserService.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // Every hour
    
  } catch (error) {
    fastify.log.error('Error starting server:');
    fastify.log.error(error);
    console.error('Full error details:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  fastify.log.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
start();