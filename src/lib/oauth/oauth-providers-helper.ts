/**
 * OAuth Providers Admin Helper
 *
 * Manages OAuth provider records in `oauth_providers` table for the standard providers
 * (Google, Facebook, Twitter). Auth/token/userinfo URLs and scopes are presets — admin
 * only supplies client_id + client_secret + enable toggle.
 *
 * Cache invalidation is handled here so UI saves take effect immediately, since the OAuth
 * library (`src/lib/oauth/oauth.ts`) caches providers in Redis for 1h.
 */

import { queryOne } from '../postgres';
import { deleteCache } from '../cache';

export interface OAuthProviderPreset {
  provider_key: string;
  provider_name: string;
  auth_url: string;
  token_url: string;
  userinfo_url: string;
  scope: string;
}

export const OAUTH_PROVIDER_PRESETS: Record<string, OAuthProviderPreset & {
  console_url: string;
  console_label: string;
}> = {
  google: {
    provider_key: 'google',
    provider_name: 'Google',
    auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    userinfo_url: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid email profile',
    console_url: 'https://console.cloud.google.com/apis/credentials',
    console_label: 'Google Cloud Console → Credentials',
  },
  facebook: {
    provider_key: 'facebook',
    provider_name: 'Facebook',
    auth_url: 'https://www.facebook.com/v18.0/dialog/oauth',
    token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userinfo_url: 'https://graph.facebook.com/me?fields=id,name,email,picture',
    scope: 'email,public_profile',
    console_url: 'https://developers.facebook.com/apps',
    console_label: 'Facebook for Developers → My Apps',
  },
  twitter: {
    provider_key: 'twitter',
    provider_name: 'Twitter',
    auth_url: 'https://twitter.com/i/oauth2/authorize',
    token_url: 'https://api.twitter.com/2/oauth2/token',
    userinfo_url: 'https://api.twitter.com/2/users/me?user.fields=profile_image_url',
    scope: 'tweet.read users.read',
    console_url: 'https://developer.twitter.com/en/portal/dashboard',
    console_label: 'X Developer Portal',
  },
};

export interface OAuthProviderRow {
  id: string;
  provider_key: string;
  provider_name: string;
  client_id: string;
  client_secret: string;
  is_enabled: boolean;
}

export interface OAuthProviderAdminView {
  provider_key: string;
  provider_name: string;
  client_id: string;
  client_secret_masked: string;
  client_secret_set: boolean;
  is_enabled: boolean;
  configured: boolean;
  /** Provider'ın developer console linki (admin'in client_id/secret aldığı yer) */
  console_url: string;
  console_label: string;
  /** Admin'in provider tarafında kaydetmesi gereken redirect/callback URI */
  redirect_uri: string;
}

function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return secret ? '****' : '';
  return secret.slice(0, 4) + '****' + secret.slice(-4);
}

/**
 * List the three standard providers, merging DB state with presets.
 * Always returns 3 rows (one per preset), even if the DB has no record yet.
 *
 * Each row also includes the redirect_uri the admin must register with the
 * provider, derived from the configured app URL (`getPublicAppUrl()`), so the
 * UI can show "Sağlayıcı paneline bunu yapıştırın" without the admin guessing.
 */
export async function listOAuthProvidersForAdmin(): Promise<OAuthProviderAdminView[]> {
  // Lazy-import to avoid pulling postgres into modules that only need the presets.
  const { getPublicAppUrl } = await import('../public-app-url');
  const redirectBase = `${getPublicAppUrl()}/api/auth/oauth/callback`;
  const result: OAuthProviderAdminView[] = [];
  for (const preset of Object.values(OAUTH_PROVIDER_PRESETS)) {
    const row = await queryOne<OAuthProviderRow>(
      'SELECT provider_key, provider_name, client_id, client_secret, is_enabled FROM oauth_providers WHERE provider_key = $1',
      [preset.provider_key],
    );
    result.push({
      provider_key: preset.provider_key,
      provider_name: preset.provider_name,
      client_id: row?.client_id || '',
      client_secret_masked: row ? maskSecret(row.client_secret) : '',
      client_secret_set: Boolean(row?.client_secret),
      is_enabled: Boolean(row?.is_enabled),
      configured: Boolean(row),
      console_url: preset.console_url,
      console_label: preset.console_label,
      redirect_uri: redirectBase,
    });
  }
  return result;
}

export interface UpsertOAuthProviderInput {
  provider_key: string;
  client_id?: string;
  client_secret?: string;
  is_enabled?: boolean;
}

/**
 * Upsert a provider record. Skips empty/masked secrets so the existing one is preserved.
 * Auth/token/userinfo URLs come from the preset table.
 */
export async function upsertOAuthProviderFromAdmin(input: UpsertOAuthProviderInput): Promise<void> {
  const preset = OAUTH_PROVIDER_PRESETS[input.provider_key];
  if (!preset) throw new Error(`Unknown OAuth provider: ${input.provider_key}`);

  const existing = await queryOne<OAuthProviderRow>(
    'SELECT client_id, client_secret, is_enabled FROM oauth_providers WHERE provider_key = $1',
    [input.provider_key],
  );

  const clientId = input.client_id ?? existing?.client_id ?? '';
  const isEnabled = input.is_enabled ?? existing?.is_enabled ?? false;

  // Preserve the existing secret if the input is empty or contains the mask placeholder.
  const incomingSecret = (input.client_secret || '').trim();
  const clientSecret =
    incomingSecret && !incomingSecret.includes('****')
      ? incomingSecret
      : existing?.client_secret || '';

  const { pool } = await import('../postgres');
  if (existing) {
    await pool.query(
      `UPDATE oauth_providers
       SET client_id = $1, client_secret = $2, is_enabled = $3,
           auth_url = $4, token_url = $5, userinfo_url = $6, scope = $7,
           updated_at = NOW()
       WHERE provider_key = $8`,
      [
        clientId,
        clientSecret,
        isEnabled,
        preset.auth_url,
        preset.token_url,
        preset.userinfo_url,
        preset.scope,
        input.provider_key,
      ],
    );
  } else {
    await pool.query(
      `INSERT INTO oauth_providers
        (provider_name, provider_key, client_id, client_secret, auth_url, token_url, userinfo_url, scope, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        preset.provider_name,
        preset.provider_key,
        clientId,
        clientSecret,
        preset.auth_url,
        preset.token_url,
        preset.userinfo_url,
        preset.scope,
        isEnabled,
      ],
    );
  }

  // The OAuth lib caches in Redis for 1h; clear so the next request reads the new value.
  await deleteCache(`oauth:provider:${input.provider_key}`).catch(() => null);
  await deleteCache('oauth:providers:list').catch(() => null);
}
