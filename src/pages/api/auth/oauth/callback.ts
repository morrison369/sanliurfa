/**
 * OAuth Callback Endpoint
 * Handle OAuth provider callback
 */

import type { APIRoute } from 'astro';
import { verifyOAuthState, getOAuthProvider, linkOAuthAccount, getOAuthAccountByProvider } from '../../../../lib/oauth';
import { runOAuthSessionFlow } from '../../../../lib/auth/auth-flows';
import { hashPassword } from '../../../../lib/auth';
import { queryOne, query } from '../../../../lib/postgres';
import { randomBytes } from 'node:crypto';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

type OAuthProviderConfig = NonNullable<Awaited<ReturnType<typeof getOAuthProvider>>> & {
  client_secret: string;
};
type OAuthState = {
  provider_key: string;
  redirect_uri: string;
  user_id?: string | null;
};
type OAuthAccount = {
  user_id?: string | null;
};
type OAuthTokenData = {
  access_token: string;
  refresh_token?: string;
  expires_at: Date;
};
type OAuthUserInfo = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};
type UserIdRow = {
  id: string;
};

export const GET: APIRoute = async ({ request, url, cookies }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      logger.warn('OAuth error', Object.assign(new Error('OAuth error'), { error, error_description: url.searchParams.get('error_description') }));
      return apiError(ErrorCode.AUTHENTICATION_FAILED, `OAuth hatası: ${error}`, HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (!code || !state) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Kod ve state gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify state token
    const oauthState = await verifyOAuthState(state) as OAuthState | null;
    if (!oauthState) {
      return apiError(ErrorCode.AUTHENTICATION_FAILED, 'State geçersiz veya süresi dolmuş', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get provider
    const provider = await getOAuthProvider(oauthState.provider_key) as OAuthProviderConfig | null;
    if (!provider) {
      return apiError(ErrorCode.NOT_FOUND, 'OAuth sağlayıcısı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Exchange code for token (simplified - implement with provider SDK)
    const tokenData = await exchangeCodeForToken(provider, code, oauthState.redirect_uri);
    if (!tokenData) {
      return apiError(ErrorCode.AUTHENTICATION_FAILED, 'Kod token ile değiştirilemedi', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get user info from provider
    const userInfo = await getUserInfoFromProvider(provider, tokenData.access_token);
    if (!userInfo) {
      return apiError(ErrorCode.AUTHENTICATION_FAILED, 'Kullanıcı bilgisi alınamadı', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Check if OAuth account already exists
    let oauthAccount = await getOAuthAccountByProvider(oauthState.provider_key, userInfo.id) as OAuthAccount | null;

    let userId = oauthAccount?.user_id;

    if (!userId) {
      // Check if user exists by email
      const existingUser = await queryOne<UserIdRow>(
        'SELECT id FROM users WHERE email = $1',
        [userInfo.email]
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Auto-register: OAuth provider doğrulanmış email + isim → yeni user yarat.
        // Password unused olduğu için random placeholder hash; gerçek auth OAuth ile.
        const placeholderPassword = randomBytes(32).toString('hex');
        const passwordHash = await hashPassword(placeholderPassword);
        const fullName = userInfo.name || userInfo.email.split('@')[0] || 'Yeni Üye';
        const avatarUrl = userInfo.picture || null;
        const inserted = await query<UserIdRow>(
          `INSERT INTO users (full_name, email, password_hash, role, avatar_url, email_verified)
           VALUES ($1, $2, $3, 'user', $4, true)
           RETURNING id`,
          [fullName, userInfo.email, passwordHash, avatarUrl],
        );
        userId = inserted.rows[0]?.id;
        if (!userId) {
          return apiError(ErrorCode.INTERNAL_ERROR, 'Yeni kullanıcı oluşturulamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
        }
        logger.info('OAuth auto-register', { userId, provider: oauthState.provider_key, email: userInfo.email });
      }
    }

    // Link OAuth account if new
    if (!oauthAccount) {
      await linkOAuthAccount(userId, oauthState.provider_key, {
        provider_user_id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.picture,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenData.expires_at
      });
    }

    // Get user email and role for JWT — userId already resolved above
    const userForToken = await queryOne<{ email: string; role: string }>(
      'SELECT email, role FROM users WHERE id = $1',
      [userId],
    );
    if (!userForToken) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Kullanıcı bilgisi alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    // Standard JWT session — same as password login (HARD RULE #35 uyumlu)
    await runOAuthSessionFlow(userId, userForToken.email, userForToken.role, cookies);

    logger.info('OAuth login successful', { userId, provider: oauthState.provider_key });

    // Post-login redirect: authorize endpoint'te cookie'ye yazdığımız path'e dön.
    // Allowlist: same-origin relative path, // ile başlayamaz (open-redirect koruması).
    const postRedirect = cookies.get('oauth_post_redirect')?.value;
    const baseTarget =
      postRedirect && postRedirect.startsWith('/') && !postRedirect.startsWith('//')
        ? postRedirect
        : '/';
    cookies.delete('oauth_post_redirect', { path: '/' });

    // Auth success signal — client-side sfTrack tetiklenir
    const target = baseTarget.includes('?')
      ? `${baseTarget}&auth_success=oauth_${oauthState.provider_key}`
      : `${baseTarget}?auth_success=oauth_${oauthState.provider_key}`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': target,
        'X-Request-ID': requestId,
      },
    });
  } catch (error) {
    logger.error('OAuth callback failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'OAuth geri dönüş işlemi başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

async function exchangeCodeForToken(
  provider: OAuthProviderConfig,
  code: string,
  redirectUri: string
): Promise<OAuthTokenData | null> {
  try {
    // In production, use provider SDK (like google-auth-library)
    // For now, simplified implementation
    const response = await fetch(provider.token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: provider.client_id,
        client_secret: provider.client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    const data = await response.json() as Record<string, unknown>;
    if (typeof data.access_token !== 'string') return null;
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;

    return {
      access_token: data.access_token,
      ...(typeof data.refresh_token === 'string' ? { refresh_token: data.refresh_token } : {}),
      expires_at: new Date(Date.now() + expiresIn * 1000),
    };
  } catch (error) {
    logger.error('Code exchange failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

async function getUserInfoFromProvider(
  provider: OAuthProviderConfig,
  accessToken: string
): Promise<OAuthUserInfo | null> {
  try {
    const response = await fetch(provider.userinfo_url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await response.json() as Record<string, unknown>;
    const id = typeof data.sub === 'string' ? data.sub : typeof data.id === 'string' ? data.id : '';
    const email = typeof data.email === 'string' ? data.email : '';

    if (!id || !email) return null;

    return {
      id,
      email,
      ...(typeof data.name === 'string' ? { name: data.name } : {}),
      ...(typeof data.picture === 'string' ? { picture: data.picture } : {}),
    };
  } catch (error) {
    logger.error('Get user info failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
