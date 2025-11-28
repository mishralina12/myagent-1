import { db } from '../../database/client';
import { oauthProviders, NewOAuthProvider, OAuthProvider, users } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { config } from '../../config/index';

export class OAuthService {
  /**
   * Get LinkedIn authorization URL
   */
  getLinkedInAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.linkedin.clientId,
      redirect_uri: config.linkedin.callbackUrl,
      state,
      scope: 'openid profile email w_member_social', // w_member_social for posting
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange LinkedIn authorization code for access token
   */
  async exchangeLinkedInCode(code: string): Promise<{
    accessToken: string;
    expiresIn: number;
    refreshToken?: string;
  }> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.linkedin.clientId,
        client_secret: config.linkedin.clientSecret,
        redirect_uri: config.linkedin.callbackUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Get LinkedIn user profile
   */
  async getLinkedInProfile(accessToken: string): Promise<{
    id: string;
    email: string;
    name: string;
  }> {
    // Get user info
    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    const userData = await userResponse.json();

    return {
      id: userData.sub, // LinkedIn user ID
      email: userData.email,
      name: userData.name || `${userData.given_name} ${userData.family_name}`,
    };
  }

  /**
   * Store or update OAuth provider connection
   */
  async storeOAuthProvider(
    userId: string,
    provider: 'linkedin' | 'google',
    data: {
      providerUserId: string;
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
      scopes: string[];
    }
  ): Promise<OAuthProvider> {
    const tokenExpiresAt = new Date(Date.now() + data.expiresIn * 1000);

    // Check if provider already exists
    const existing = await db
      .select()
      .from(oauthProviders)
      .where(
        and(
          eq(oauthProviders.userId, userId),
          eq(oauthProviders.provider, provider)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing provider
      const [updated] = await db
        .update(oauthProviders)
        .set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || existing[0].refreshToken,
          tokenExpiresAt,
          scopes: data.scopes,
          updatedAt: new Date(),
        })
        .where(eq(oauthProviders.id, existing[0].id))
        .returning();

      return updated;
    }

    // Create new provider
    const [newProvider] = await db
      .insert(oauthProviders)
      .values({
        userId,
        provider,
        providerUserId: data.providerUserId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt,
        scopes: data.scopes,
      })
      .returning();

    return newProvider;
  }

  /**
   * Get OAuth provider for user
   */
  async getOAuthProvider(
    userId: string,
    provider: 'linkedin' | 'google'
  ): Promise<OAuthProvider | null> {
    const [result] = await db
      .select()
      .from(oauthProviders)
      .where(
        and(
          eq(oauthProviders.userId, userId),
          eq(oauthProviders.provider, provider)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Check if OAuth token is expired
   */
  isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    return new Date() >= expiresAt;
  }

  /**
   * Refresh LinkedIn access token
   */
  async refreshLinkedInToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.linkedin.clientId,
        client_secret: config.linkedin.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }
}
