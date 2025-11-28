import { FastifyInstance } from 'fastify';
import { OAuthController } from './oauth.controller';

export async function oauthRoutes(app: FastifyInstance) {
  const oauthController = new OAuthController();

  // All OAuth routes require authentication
  const authPreHandler = [app.authenticate];

  // LinkedIn OAuth routes
  app.get('/auth/linkedin', {
    preHandler: authPreHandler,
  }, oauthController.linkedInConnect.bind(oauthController));

  app.get('/auth/linkedin/callback',
    oauthController.linkedInCallback.bind(oauthController)
  );

  app.get('/auth/linkedin/status', {
    preHandler: authPreHandler,
  }, oauthController.linkedInStatus.bind(oauthController));

  app.delete('/auth/linkedin', {
    preHandler: authPreHandler,
  }, oauthController.linkedInDisconnect.bind(oauthController));
}
