/**
 * OAuth Authorization Endpoint
 * Redirect to OAuth provider
 */

import type { APIRoute } from 'astro';
import { getOAuthProvider, generateOAuthState } from '../../../../lib/oauth';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { getPublicAppUrl } from '../../../../lib/public-app-url';
import { logger } from '../../../../lib/logging';

// Allowlist: redirect_uri must match one of these canonical values.
// OAuth providers also validate this server-side (defense-in-depth).
const ALLOWED_REDIRECT_URIS = [`${getPublicAppUrl()}/api/auth/oauth/callback`];
const DEFAULT_REDIRECT_URI = ALLOWED_REDIRECT_URIS[0];

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    const providerKey = url.searchParams.get('provider');
    const requestedUri = url.searchParams.get('redirect_uri');
    // Reject redirect_uri not in the allowlist — prevents open redirect in OAuth flow.
    const redirectUri =
      requestedUri && ALLOWED_REDIRECT_URIS.includes(requestedUri)
        ? requestedUri
        : DEFAULT_REDIRECT_URI;

    if (!providerKey) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Sağlayıcı anahtarı gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get provider configuration
    const provider = await getOAuthProvider(providerKey);
    if (!provider) {
      return apiError(ErrorCode.NOT_FOUND, 'OAuth sağlayıcısı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
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
    return apiError(ErrorCode.INTERNAL_ERROR, 'OAuth yetkilendirme başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
