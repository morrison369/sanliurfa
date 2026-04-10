/**
 * OAuth Callback Endpoint
 * Handle OAuth provider callback
 */

import type { APIRoute } from 'astro';
import { verifyOAuthState, getOAuthProvider, linkOAuthAccount, getOAuthAccountByProvider } from '../../../../lib/oauth';
import { createUserSession } from '../../../../lib/security';
import { queryOne } from '../../../../lib/postgres';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { enforceRateLimitPolicy, getClientIpAddress } from '../../../../lib/sensitive-endpoint-policy';

interface OAuthProviderConfig {
  provider_key: string;
  client_id: string;
  client_secret: string;
  token_url: string;
  userinfo_url: string;
}

interface OAuthTokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: Date | null;
}

interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

function isValidProviderConfig(provider: any): provider is OAuthProviderConfig {
  return Boolean(
    provider &&
    typeof provider.provider_key === 'string' &&
    typeof provider.client_id === 'string' &&
    typeof provider.client_secret === 'string' &&
    typeof provider.token_url === 'string' &&
    typeof provider.userinfo_url === 'string'
  );
}

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    const clientIp = getClientIpAddress(request);
    const policyResponse = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `auth:oauth:callback:ip:${clientIp}`,
      limit: 120,
      windowSeconds: 60,
      message: 'Too many OAuth callback attempts'
    });
    if (policyResponse) {
      return policyResponse;
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      logger.warn('OAuth error', { error, error_description: url.searchParams.get('error_description') });
      return apiError(ErrorCode.AUTH_ERROR, `OAuth error: ${error}`, HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (!code || !state) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Code and state required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify state token
    const oauthState = await verifyOAuthState(state);
    if (!oauthState) {
      return apiError(ErrorCode.AUTH_ERROR, 'Invalid or expired state', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get provider
    const provider = await getOAuthProvider(oauthState.provider_key);
    if (!provider || !isValidProviderConfig(provider)) {
      return apiError(ErrorCode.NOT_FOUND, 'OAuth provider not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Exchange code for token (simplified - implement with provider SDK)
    const tokenData = await exchangeCodeForToken(provider, code, oauthState.redirect_uri);
    if (!tokenData) {
      return apiError(ErrorCode.AUTH_ERROR, 'Failed to exchange code', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get user info from provider
    const userInfo = await getUserInfoFromProvider(provider, tokenData.access_token);
    if (!userInfo) {
      return apiError(ErrorCode.AUTH_ERROR, 'Failed to get user info', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Check if OAuth account already exists
    let oauthAccount = await getOAuthAccountByProvider(oauthState.provider_key, userInfo.id);

    let userId = oauthAccount?.user_id;

    if (!userId) {
      if (!userInfo.email) {
        return apiError(ErrorCode.AUTH_ERROR, 'OAuth provider did not return an email address', HttpStatus.BAD_REQUEST, undefined, requestId);
      }

      // Check if user exists by email
      const existingUser = await queryOne(
        'SELECT id FROM users WHERE email = $1',
        [userInfo.email]
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        return apiError(ErrorCode.AUTH_ERROR, 'User not found. Please sign up first.', HttpStatus.NOT_FOUND, undefined, requestId);
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

    // Create session
    const ipAddress = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || '';

    const session = await createUserSession(
      userId,
      'OAuth Login',
      'web',
      extractBrowser(userAgent),
      extractOS(userAgent),
      ipAddress,
      extractLocation(request.headers),
      false
    );

    if (!session) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create session', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    logger.info('OAuth login successful', { userId, provider: oauthState.provider_key });

    const forwardedProto = request.headers.get('x-forwarded-proto');
    const isSecureCookie = forwardedProto ? forwardedProto === 'https' : url.protocol === 'https:';
    const cookieParts = [
      `auth-token=${session.session_token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=86400'
    ];

    if (isSecureCookie) {
      cookieParts.push('Secure');
    }

    // Redirect to dashboard
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': cookieParts.join('; '),
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    logger.error('OAuth callback failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'OAuth callback failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

async function exchangeCodeForToken(provider: OAuthProviderConfig, code: string, redirectUri: string): Promise<OAuthTokenData | null> {
  try {
    const response = await fetch(provider.token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({
        code: code,
        client_id: provider.client_id,
        client_secret: provider.client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!response.ok) {
      logger.warn('OAuth token exchange rejected', { status: response.status, provider: provider.provider_key });
      return null;
    }

    const data = await response.json();
    if (!data?.access_token) {
      logger.warn('OAuth token exchange returned no access token', { provider: provider.provider_key });
      return null;
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: typeof data.expires_in === 'number' ? new Date(Date.now() + data.expires_in * 1000) : null
    };
  } catch (error) {
    logger.error('Code exchange failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

async function getUserInfoFromProvider(provider: OAuthProviderConfig, accessToken: string): Promise<OAuthUserInfo | null> {
  try {
    const response = await fetch(provider.userinfo_url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      logger.warn('OAuth user info request rejected', { status: response.status, provider: provider.provider_key });
      return null;
    }

    const data = await response.json();

    const userId = data.sub || data.id;
    if (!userId || typeof userId !== 'string') {
      logger.warn('OAuth user info payload missing user id', { provider: provider.provider_key });
      return null;
    }

    return {
      id: userId,
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  } catch (error) {
    logger.error('Get user info failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

function extractBrowser(userAgent: string): string {
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  return 'Unknown';
}

function extractOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone')) return 'iOS';
  return 'Unknown';
}

function extractLocation(headers: Headers): string {
  const city =
    headers.get('x-vercel-ip-city') ||
    headers.get('cf-ipcity') ||
    headers.get('x-appengine-city') ||
    '';
  const region =
    headers.get('x-vercel-ip-country-region') ||
    headers.get('cf-region-code') ||
    '';
  const country =
    headers.get('x-vercel-ip-country') ||
    headers.get('cf-ipcountry') ||
    headers.get('x-appengine-country') ||
    '';

  const parts = [city, region, country].map((part) => part?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'unknown';
}
