/**
 * Social Authentication Module
 * Supports Google, Facebook, and Twitter OAuth
 */

import { query } from '../postgres';
import { generateJWT } from '../auth';

// Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

const BASE_URL = process.env.SITE_URL || 'http://localhost:4321';

export interface SocialUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatar?: string;
    token: string;
  };
  error?: string;
}

/**
 * Google OAuth Provider
 */
class GoogleAuth {
  private clientId = GOOGLE_CLIENT_ID;
  private clientSecret = GOOGLE_CLIENT_SECRET;
  private redirectUri = `${BASE_URL}/api/auth/google/callback`;

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleCallback(code: string): Promise<AuthResult> {
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return { success: false, error: tokenData.error_description || 'Google auth failed' };
      }

      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        return { success: false, error: 'Failed to get user info from Google' };
      }

      const socialUser: SocialUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        provider: 'google',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      };

      return this.createOrLoginUser(socialUser);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Google auth error' };
    }
  }

  private async createOrLoginUser(socialUser: SocialUser): Promise<AuthResult> {
    // Check if user exists
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [socialUser.email]
    );

    let userId: string;

    if (result.rows.length === 0) {
      // Create new user
      const insertResult = await query(
        `INSERT INTO users (email, full_name, avatar_url, provider, provider_id, created_at, status)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'active')
         RETURNING id`,
        [socialUser.email, socialUser.name, socialUser.picture, socialUser.provider, socialUser.id]
      );
      userId = (insertResult.rows[0] as any).id;
    } else {
      // Update existing user with social info
      userId = (result.rows[0] as any).id;
      await query(
        'UPDATE users SET provider = $1, provider_id = $2, avatar_url = $3 WHERE id = $4',
        [socialUser.provider, socialUser.id, socialUser.picture, userId]
      );
    }

    // Generate JWT
    const token = generateJWT(userId, socialUser.email);

    return {
      success: true,
      user: {
        id: userId,
        email: socialUser.email,
        fullName: socialUser.name,
        avatar: socialUser.picture,
        token,
      },
    };
  }
}

/**
 * Facebook OAuth Provider
 */
class FacebookAuth {
  private appId = FACEBOOK_APP_ID;
  private appSecret = FACEBOOK_APP_SECRET;
  private redirectUri = `${BASE_URL}/api/auth/facebook/callback`;

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.appId!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  }

  async handleCallback(code: string): Promise<AuthResult> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?${new URLSearchParams({
          client_id: this.appId!,
          client_secret: this.appSecret!,
          redirect_uri: this.redirectUri,
          code,
        })}`
      );

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return { success: false, error: tokenData.error?.message || 'Facebook auth failed' };
      }

      // Get user info
      const userResponse = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
      );

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        return { success: false, error: 'Failed to get user info from Facebook' };
      }

      const socialUser: SocialUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture?.data?.url,
        provider: 'facebook',
        accessToken: tokenData.access_token,
      };

      return this.createOrLoginUser(socialUser);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Facebook auth error' };
    }
  }

  private async createOrLoginUser(socialUser: SocialUser): Promise<AuthResult> {
    const result = await query('SELECT * FROM users WHERE email = $1', [socialUser.email]);

    let userId: string;

    if (result.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO users (email, full_name, avatar_url, provider, provider_id, created_at, status)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'active')
         RETURNING id`,
        [socialUser.email, socialUser.name, socialUser.picture, socialUser.provider, socialUser.id]
      );
      userId = (insertResult.rows[0] as any).id;
    } else {
      userId = (result.rows[0] as any).id;
      await query(
        'UPDATE users SET provider = $1, provider_id = $2, avatar_url = $3 WHERE id = $4',
        [socialUser.provider, socialUser.id, socialUser.picture, userId]
      );
    }

    const token = generateJWT(userId, socialUser.email);

    return {
      success: true,
      user: {
        id: userId,
        email: socialUser.email,
        fullName: socialUser.name,
        avatar: socialUser.picture,
        token,
      },
    };
  }
}

/**
 * Twitter OAuth Provider (OAuth 2.0)
 */
class TwitterAuth {
  private clientId = TWITTER_CLIENT_ID;
  private clientSecret = TWITTER_CLIENT_SECRET;
  private redirectUri = `${BASE_URL}/api/auth/twitter/callback`;

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId!,
      redirect_uri: this.redirectUri,
      scope: 'tweet.read users.read',
      state,
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
    });

    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  async handleCallback(code: string): Promise<AuthResult> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code_verifier: 'challenge',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return { success: false, error: tokenData.error_description || 'Twitter auth failed' };
      }

      // Get user info
      const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        return { success: false, error: 'Failed to get user info from Twitter' };
      }

      const user = userData.data;

      const socialUser: SocialUser = {
        id: user.id,
        email: user.username + '@twitter.com', // Twitter doesn't always provide email
        name: user.name,
        picture: user.profile_image_url,
        provider: 'twitter',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      };

      return this.createOrLoginUser(socialUser);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Twitter auth error' };
    }
  }

  private async createOrLoginUser(socialUser: SocialUser): Promise<AuthResult> {
    const result = await query(
      'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
      [socialUser.provider, socialUser.id]
    );

    let userId: string;

    if (result.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO users (email, full_name, avatar_url, provider, provider_id, created_at, status)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'active')
         RETURNING id`,
        [socialUser.email, socialUser.name, socialUser.picture, socialUser.provider, socialUser.id]
      );
      userId = (insertResult.rows[0] as any).id;
    } else {
      userId = (result.rows[0] as any).id;
    }

    const token = generateJWT(userId, socialUser.email);

    return {
      success: true,
      user: {
        id: userId,
        email: socialUser.email,
        fullName: socialUser.name,
        avatar: socialUser.picture,
        token,
      },
    };
  }
}

// Social Sharing Functions
export const socialShare = {
  twitter: (text: string, url: string, hashtags?: string[]) => {
    const params = new URLSearchParams({
      text,
      url,
    });
    if (hashtags) params.append('hashtags', hashtags.join(','));
    return `https://twitter.com/intent/tweet?${params}`;
  },

  facebook: (url: string, quote?: string) => {
    const params = new URLSearchParams({
      u: url,
    });
    if (quote) params.append('quote', quote);
    return `https://www.facebook.com/sharer/sharer.php?${params}`;
  },

  whatsapp: (text: string) => {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  },

  telegram: (text: string, url: string) => {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  },

  linkedin: (url: string, title?: string, summary?: string) => {
    const params = new URLSearchParams({
      url,
      mini: 'true',
    });
    if (title) params.append('title', title);
    if (summary) params.append('summary', summary);
    return `https://www.linkedin.com/sharing/share-offsite/?${params}`;
  },
};

// Singleton instances
export const googleAuth = GOOGLE_CLIENT_ID ? new GoogleAuth() : null;
export const facebookAuth = FACEBOOK_APP_ID ? new FacebookAuth() : null;
export const twitterAuth = TWITTER_CLIENT_ID ? new TwitterAuth() : null;

// Helper to get available providers
export function getAvailableProviders(): { id: string; name: string; icon: string }[] {
  const providers = [];
  if (googleAuth) providers.push({ id: 'google', name: 'Google', icon: 'google' });
  if (facebookAuth) providers.push({ id: 'facebook', name: 'Facebook', icon: 'facebook' });
  if (twitterAuth) providers.push({ id: 'twitter', name: 'Twitter', icon: 'twitter' });
  return providers;
}

export default { googleAuth, facebookAuth, twitterAuth, socialShare };
