import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport: config.nodeEnv === 'development' ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
    requestIdLogLabel: 'requestId',
    genReqId: () => crypto.randomUUID(),
  });

  // Security: Helmet for HTTP headers
  await app.register(helmet, {
    contentSecurityPolicy: config.nodeEnv === 'production',
  });

  // CORS configuration
  await app.register(cors, {
    origin: config.nodeEnv === 'production'
      ? [config.apiBaseUrl]
      : true, // Allow all origins in development
    credentials: true,
  });

  // JWT authentication
  await app.register(jwt, {
    secret: config.jwt.secret,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    errorResponseBuilder: (request, context) => ({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${context.after}`,
      retryAfter: context.after,
    }),
  });

  // Register authentication middleware
  app.decorate('authenticate', async (request: any, reply: any) => {
    const { authenticate } = await import('./shared/middleware/auth.middleware');
    return authenticate(request, reply);
  });

  // Register routes
  const { authRoutes } = await import('./modules/auth/auth.routes');
  const { oauthRoutes } = await import('./modules/auth/oauth.routes');
  await app.register(authRoutes);
  await app.register(oauthRoutes);

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
    };
  });

  // Database health check
  app.get('/health/db', async (request, reply) => {
    try {
      const { db } = await import('./database/client');
      // Simple query to test connection
      await db.execute('SELECT 1');
      return {
        status: 'ok',
        database: 'connected',
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Redis health check
  app.get('/health/redis', async (request, reply) => {
    try {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
      });
      const pong = await redis.ping();
      await redis.quit();
      return {
        status: 'ok',
        redis: pong === 'PONG' ? 'connected' : 'error',
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'error',
        redis: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // JWT errors
    if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Validation errors
    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: error.validation,
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.code(429).send({
        error: 'Too Many Requests',
        message: error.message,
      });
    }

    // Default 500 error
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: config.nodeEnv === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      requestId: request.id,
    });
  });

  return app;
}
