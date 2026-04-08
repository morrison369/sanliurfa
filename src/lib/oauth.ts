/**
 * OAuth Support Library
 * OAuth 2.0 / OpenID Connect integration with multiple providers
 */

import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';
import crypto from 'crypto';

interface OAuthProvider {
  id: string;
  provider_name: string;
  provider_key: string;
  client_id: string;
  auth_url: string;
  token_url: string;
  userinfo_url: string;
  scope: string;
  is_enabled: boolean;
}

interface OAuthAccount {
  id: string;
  user_id: string;
  provider_key: string;
  provider_user_id: string;
  provider_email: string;
  provider_name: string;
  provider_avatar_url: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: Date;
  is_primary: boolean;
  last_used_at: Date;
}

export async function getOAuthProvider(providerKey: string): Promise<OAuthProvider | null> {
  try {
    const cacheKey = `sanliurfa:oauth:provider:${providerKey}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const provider = await queryOne(
      'SELECT * FROM oauth_providers WHERE provider_key = $1 AND is_enabled = true',
      [providerKey]
    );

    if (provider) {
      await setCache(cacheKey, JSON.stringify(provider), 3600);
    }

    return provider || null;
  } catch (error) {
    logger.error('Failed to get OAuth provider', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function listOAuthProviders(): Promise<OAuthProvider[]> {
  try {
    const cacheKey = 'sanliurfa:oauth:providers:list';
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const providers = await queryMany(
      'SELECT * FROM oauth_providers WHERE is_enabled = true ORDER BY provider_name ASC',
      []
    );

    await setCache(cacheKey, JSON.stringify(providers), 3600);
    return providers;
  } catch (error) {
    logger.error('Failed to list OAuth providers', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function generateOAuthState(providerKey: string, redirectUri: string, userId?: string): Promise<string> {
  try {
    const stateToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await insert('oauth_states', {
      state_token: stateToken,
      provider_key: providerKey,
      redirect_uri: redirectUri,
      user_id: userId || null,
      is_used: false,
      expires_at: expiresAt
    });

    logger.info('OAuth state generated', { provider: providerKey, stateToken: stateToken.substring(0, 8) });
    return stateToken;
  } catch (error) {
    logger.error('Failed to generate OAuth state', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function verifyOAuthState(stateToken: string): Promise<any | null> {
  try {
    const state = await queryOne(
      'SELECT * FROM oauth_states WHERE state_token = $1 AND expires_at > NOW() AND is_used = false',
      [stateToken]
    );

    if (state) {
      // Mark state as used
      await update('oauth_states', { state_token: stateToken }, { is_used: true });
    }

    return state || null;
  } catch (error) {
    logger.error('Failed to verify OAuth state', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function linkOAuthAccount(userId: string, providerKey: string, oauthData: any): Promise<OAuthAccount | null> {
  try {
    const result = await insert('user_oauth_accounts', {
      user_id: userId,
      provider_key: providerKey,
      provider_user_id: oauthData.provider_user_id,
      provider_email: oauthData.email,
      provider_name: oauthData.name,
      provider_avatar_url: oauthData.avatar_url,
      access_token: oauthData.access_token,
      refresh_token: oauthData.refresh_token,
      token_expires_at: oauthData.token_expires_at,
      is_primary: false,
      last_used_at: new Date()
    });

    await deleteCache(`sanliurfa:user:oauth:${userId}`);
    logger.info('OAuth account linked', { userId, provider: providerKey });
    return result;
  } catch (error) {
    logger.error('Failed to link OAuth account', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
  try {
    const cacheKey = `sanliurfa:user:oauth:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const accounts = await queryMany(
      'SELECT * FROM user_oauth_accounts WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [userId]
    );

    await setCache(cacheKey, JSON.stringify(accounts), 1800);
    return accounts;
  } catch (error) {
    logger.error('Failed to get user OAuth accounts', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function unlinkOAuthAccount(userId: string, accountId: string): Promise<boolean> {
  try {
    const account = await queryOne(
      'SELECT * FROM user_oauth_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (!account) {
      return false;
    }

    // Don't allow unlinking if it's the only account
    const accountCount = await queryOne(
      'SELECT COUNT(*) as count FROM user_oauth_accounts WHERE user_id = $1',
      [userId]
    );

    if (accountCount?.count <= 1) {
      logger.warn('Cannot unlink only OAuth account', { userId, accountId });
      return false;
    }

    // Delete the account
    await queryOne('DELETE FROM user_oauth_accounts WHERE id = $1', [accountId]);

    await deleteCache(`sanliurfa:user:oauth:${userId}`);
    logger.info('OAuth account unlinked', { userId, accountId });
    return true;
  } catch (error) {
    logger.error('Failed to unlink OAuth account', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getOAuthAccountByProvider(providerKey: string, providerUserId: string): Promise<any | null> {
  try {
    const account = await queryOne(
      'SELECT * FROM user_oauth_accounts WHERE provider_key = $1 AND provider_user_id = $2',
      [providerKey, providerUserId]
    );

    return account || null;
  } catch (error) {
    logger.error('Failed to get OAuth account by provider', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function updateOAuthToken(accountId: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<boolean> {
  try {
    const updateData: any = { access_token: accessToken };
    if (refreshToken) updateData.refresh_token = refreshToken;
    if (expiresAt) updateData.token_expires_at = expiresAt;
    updateData.updated_at = new Date();

    await update('user_oauth_accounts', { id: accountId }, updateData);

    logger.info('OAuth token refreshed', { accountId });
    return true;
  } catch (error) {
    logger.error('Failed to update OAuth token', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function recordOAuthUsage(accountId: string): Promise<void> {
  try {
    await update('user_oauth_accounts', { id: accountId }, { last_used_at: new Date() });
  } catch (error) {
    logger.error('Failed to record OAuth usage', error instanceof Error ? error : new Error(String(error)));
  }
}
