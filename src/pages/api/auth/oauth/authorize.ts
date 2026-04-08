/**
 * OAuth Authorization Endpoint
 * Redirect to OAuth provider
 */

import type { APIRoute } from 'astro';
import { getOAuthProvider, generateOAuthState } from '../../../../lib/oauth';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    const providerKey = url.searchParams.get('provider');
    const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/api/auth/oauth/callback`;

    if (!providerKey) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Provider key required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get provider configuration
    const provider = await getOAuthProvider(providerKey);
    if (!provider) {
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

    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl,
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    logger.error('OAuth authorization failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'OAuth authorization failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
