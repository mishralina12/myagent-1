import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { z } from 'zod';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate request body
      const body = registerSchema.parse(request.body);

      // Register user
      const user = await this.authService.register(body);

      // Generate JWT token
      const token = request.server.jwt.sign({
        userId: user.id,
        email: user.email,
      });

      return reply.code(201).send({
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'User with this email already exists') {
          return reply.code(409).send({
            error: 'Conflict',
            message: error.message,
          });
        }
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to register user',
      });
    }
  }

  /**
   * Login a user
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate request body
      const body = loginSchema.parse(request.body);

      // Login user
      const user = await this.authService.login(body.email, body.password);

      // Generate JWT token
      const token = request.server.jwt.sign({
        userId: user.id,
        email: user.email,
      });

      return reply.send({
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Invalid email or password' ||
            error.message === 'Password not set for this user') {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }
      }

      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to login',
      });
    }
  }

  /**
   * Get current user info
   */
  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user?.userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const user = await this.authService.getUserById(request.user.userId);

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          preferences: user.preferences,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user info',
      });
    }
  }
}
