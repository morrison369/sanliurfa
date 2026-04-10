/**
 * OAuth Authorization Endpoint
 * Redirect to OAuth provider
 */

import type { APIRoute } from 'astro';
import { getOAuthProvider, generateOAuthState } from '../../../../lib/oauth';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { enforceRateLimitPolicy, getClientIpAddress } from '../../../../lib/sensitive-endpoint-policy';
import { recordRequest } from '../../../../lib/metrics';

const PROVIDER_KEY_REGEX = /^[a-z0-9_-]{2,50}$/;

function resolveRedirectUri(rawRedirectUri: string | null, currentUrl: URL): string | null {
  if (!rawRedirectUri) {
    return `${currentUrl.origin}/api/auth/oauth/callback`;
  }

  try {
    const parsed = new URL(rawRedirectUri);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.origin !== currentUrl.origin) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const clientIp = getClientIpAddress(request);
    const policyResponse = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `auth:oauth:authorize:ip:${clientIp}`,
      limit: 60,
      windowSeconds: 60,
      message: 'Too many OAuth authorization attempts'
    });
    if (policyResponse) {
      recordRequest('GET', '/api/auth/oauth/authorize', policyResponse.status, Date.now() - startTime);
      return policyResponse;
    }

    const providerKey = url.searchParams.get('provider')?.trim().toLowerCase();
    const redirectUri = resolveRedirectUri(url.searchParams.get('redirect_uri'), url);

    if (!providerKey || !PROVIDER_KEY_REGEX.test(providerKey)) {
      recordRequest('GET', '/api/auth/oauth/authorize', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Provider key required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (!redirectUri) {
      recordRequest('GET', '/api/auth/oauth/authorize', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid redirect_uri', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get provider configuration
    const provider = await getOAuthProvider(providerKey);
    if (!provider) {
      recordRequest('GET', '/api/auth/oauth/authorize', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'OAuth provider not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Generate state token (CSRF protection)
    const state = await generateOAuthState(providerKey, redirectUri, locals.user?.id);

    // Construct OAuth authorization URL
    const authParams = new URLSearchParams({
      client_id: provider.client_id,
      redirect_uri: redirectUri,
      state: state,
      scope: provider.scope,
      response_type: 'code'
    });

    const authUrl = `${provider.auth_url}?${authParams.toString()}`;

    logger.info('OAuth authorization redirecting', { provider: providerKey, state: state.substring(0, 8) });
    recordRequest('GET', '/api/auth/oauth/authorize', 302, Date.now() - startTime);

    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl,
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    logger.error('OAuth authorization failed', error instanceof Error ? error : new Error(String(error)));
    recordRequest('GET', '/api/auth/oauth/authorize', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return apiError(ErrorCode.INTERNAL_ERROR, 'OAuth authorization failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
