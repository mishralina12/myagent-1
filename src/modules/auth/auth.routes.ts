import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';

export async function authRoutes(app: FastifyInstance) {
  const authController = new AuthController();

  // Public routes
  app.post('/auth/register', authController.register.bind(authController));
  app.post('/auth/login', authController.login.bind(authController));

  // Protected routes
  app.get('/auth/me', {
    preHandler: [app.authenticate],
  }, authController.me.bind(authController));
}
