import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload } from '../types/index';

/**
 * JWT Authentication middleware
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();

    // Attach user info to request
    const decoded = request.user as JWTPayload;
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const decoded = request.user as JWTPayload;
    request.user = decoded;
  } catch (error) {
    // Continue without authentication
    request.user = undefined;
  }
}
