/**
 * Social Authentication Providers
 * Google, Facebook, Apple, Twitter OAuth
 */

import { query } from '../postgres';
import { generateJWT } from '../auth';

export interface SocialUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Handle Google OAuth
 */
export async function handleGoogleAuth(
  code: string,
  config: OAuthConfig
): Promise<{ user: SocialUser; token: string }> {
  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const tokens = await tokenResponse.json();

  // Get user info
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });

  const googleUser = await userResponse.json();

  const socialUser: SocialUser = {
    id: googleUser.id,
    email: googleUser.email,
    name: googleUser.name,
    avatar: googleUser.picture,
    provider: 'google'
  };

  return await createOrUpdateUser(socialUser);
}

/**
 * Handle Facebook OAuth
 */
export async function handleFacebookAuth(
  code: string,
  config: OAuthConfig
): Promise<{ user: SocialUser; token: string }> {
  // Exchange code for token
  const tokenResponse = await fetch(
    `https://graph.facebook.com/v12.0/oauth/access_token?` +
    `client_id=${config.clientId}&` +
    `client_secret=${config.clientSecret}&` +
    `code=${code}&` +
    `redirect_uri=${config.redirectUri}`
  );

  const tokens = await tokenResponse.json();

  // Get user info
  const userResponse = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokens.access_token}`
  );

  const fbUser = await userResponse.json();

  const socialUser: SocialUser = {
    id: fbUser.id,
    email: fbUser.email,
    name: fbUser.name,
    avatar: fbUser.picture?.data?.url,
    provider: 'facebook'
  };

  return await createOrUpdateUser(socialUser);
}

/**
 * Handle Apple OAuth
 */
export async function handleAppleAuth(
  code: string,
  config: OAuthConfig
): Promise<{ user: SocialUser; token: string }> {
  // Apple uses different flow with JWT
  // Implementation would require JWT signing
  throw new Error('Apple OAuth not yet implemented');
}

/**
 * Create or update user from social login
 */
async function createOrUpdateUser(
  socialUser: SocialUser
): Promise<{ user: SocialUser; token: string }> {
  // Check if user exists with this social account
  const existing = await query(
    `SELECT u.* FROM users u
     JOIN social_accounts sa ON u.id = sa.user_id
     WHERE sa.provider = $1 AND sa.provider_id = $2`,
    [socialUser.provider, socialUser.id]
  );

  let userId: string;

  if (existing.rows.length > 0) {
    // Update existing user
    userId = existing.rows[0].id;
    await query(
      `UPDATE users SET name = $1, avatar = $2, last_login = NOW() WHERE id = $3`,
      [socialUser.name, socialUser.avatar, userId]
    );
  } else {
    // Check if user exists with same email
    const emailUser = await query(
      `SELECT id FROM users WHERE email = $1`,
      [socialUser.email]
    );

    if (emailUser.rows.length > 0) {
      // Link social account to existing user
      userId = emailUser.rows[0].id;
      await query(
        `INSERT INTO social_accounts (user_id, provider, provider_id, email)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (provider, provider_id) DO NOTHING`,
        [userId, socialUser.provider, socialUser.id, socialUser.email]
      );
    } else {
      // Create new user
      const result = await query(
        `INSERT INTO users (email, name, avatar, is_verified, created_at)
         VALUES ($1, $2, $3, true, NOW())
         RETURNING id`,
        [socialUser.email, socialUser.name, socialUser.avatar]
      );
      userId = result.rows[0].id;

      // Create social account link
      await query(
        `INSERT INTO social_accounts (user_id, provider, provider_id, email)
         VALUES ($1, $2, $3, $4)`,
        [userId, socialUser.provider, socialUser.id, socialUser.email]
      );
    }
  }

  // Generate JWT
  const token = generateJWT(userId, socialUser.email);

  return { user: socialUser, token };
}

/**
 * Unlink social account
 */
export async function unlinkSocialAccount(
  userId: string,
  provider: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM social_accounts WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
  return result.rowCount > 0;
}

/**
 * Get user's linked social accounts
 */
export async function getLinkedAccounts(userId: string): Promise<Array<{
  provider: string;
  email: string;
  linked_at: Date;
}>> {
  const result = await query(
    `SELECT provider, email, created_at as linked_at
     FROM social_accounts
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
}
