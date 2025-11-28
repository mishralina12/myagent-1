import { FastifyRequest, FastifyReply } from 'fastify';
import { OAuthService } from './oauth.service';
import { AuthService } from './auth.service';
import { generateRandomString } from '../../shared/utils/index';

export class OAuthController {
  private oauthService: OAuthService;
  private authService: AuthService;

  constructor() {
    this.oauthService = new OAuthService();
    this.authService = new AuthService();
  }

  /**
   * Initiate LinkedIn OAuth flow
   */
  async linkedInConnect(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user?.userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Generate state for CSRF protection
      const state = generateRandomString(32);

      // Store state in session or return it for client to send back
      // For simplicity, we'll encode userId in the state (in production, use session/redis)
      const stateWithUser = Buffer.from(
        JSON.stringify({ state, userId: request.user.userId })
      ).toString('base64');

      const authUrl = this.oauthService.getLinkedInAuthUrl(stateWithUser);

      return reply.send({
        data: {
          authUrl,
          state: stateWithUser,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to initiate LinkedIn OAuth',
      });
    }
  }

  /**
   * Handle LinkedIn OAuth callback
   */
  async linkedInCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { code, state } = request.query as { code?: string; state?: string };

      if (!code || !state) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Missing code or state parameter',
        });
      }

      // Decode state to get userId
      let userId: string;
      try {
        const decoded = JSON.parse(
          Buffer.from(state, 'base64').toString('utf-8')
        );
        userId = decoded.userId;
      } catch {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid state parameter',
        });
      }

      // Exchange code for access token
      const tokenData = await this.oauthService.exchangeLinkedInCode(code);

      // Get LinkedIn profile
      const profile = await this.oauthService.getLinkedInProfile(tokenData.accessToken);

      // Store OAuth provider
      await this.oauthService.storeOAuthProvider(userId, 'linkedin', {
        providerUserId: profile.id,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresIn: tokenData.expiresIn,
        scopes: ['openid', 'profile', 'email', 'w_member_social'],
      });

      return reply.send({
        message: 'LinkedIn account connected successfully',
        data: {
          provider: 'linkedin',
          connectedEmail: profile.email,
          connectedName: profile.name,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to connect LinkedIn account',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get LinkedIn connection status
   */
  async linkedInStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user?.userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const provider = await this.oauthService.getOAuthProvider(
        request.user.userId,
        'linkedin'
      );

      if (!provider) {
        return reply.send({
          data: {
            connected: false,
            canPost: false,
          },
        });
      }

      const isExpired = this.oauthService.isTokenExpired(provider.tokenExpiresAt);

      return reply.send({
        data: {
          connected: true,
          canPost: !isExpired && provider.scopes?.includes('w_member_social'),
          expiresAt: provider.tokenExpiresAt,
          scopes: provider.scopes,
          needsRefresh: isExpired,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch LinkedIn status',
      });
    }
  }

  /**
   * Disconnect LinkedIn account
   */
  async linkedInDisconnect(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.user?.userId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { db } = await import('../../database/client');
      const { oauthProviders } = await import('../../database/schema');
      const { eq, and } = await import('drizzle-orm');

      await db
        .delete(oauthProviders)
        .where(
          and(
            eq(oauthProviders.userId, request.user.userId),
            eq(oauthProviders.provider, 'linkedin')
          )
        );

      return reply.send({
        message: 'LinkedIn account disconnected successfully',
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to disconnect LinkedIn account',
      });
    }
  }
}
