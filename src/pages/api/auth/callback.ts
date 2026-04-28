import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ url, redirect }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  const provider = url.searchParams.get('provider');

  if (error) {
    logger.error('OAuth error:', error, errorDescription);
    return redirect(`/giris?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    return redirect('/giris?error=no_code');
  }

  try {
    if (!state) {
      logger.warn(
        'Legacy OAuth callback called without state; redirecting to login with explicit error',
        Object.assign(new Error('OAuth state missing'), { provider: provider || 'unknown' })
      );
      return redirect('/giris?error=oauth_state_required');
    }

    // Legacy callback endpoint compatibility:
    // forward valid requests to the modern OAuth callback implementation.
    const forwardUrl = new URL('/api/auth/oauth/callback', url.origin);
    forwardUrl.searchParams.set('code', code);
    forwardUrl.searchParams.set('state', state);
    if (provider) {
      forwardUrl.searchParams.set('provider', provider);
    }

    return redirect(`${forwardUrl.pathname}${forwardUrl.search}`);
  } catch (error) {
    logger.error('Auth callback error:', error);
    return redirect('/giris?error=oauth_callback_failed');
  }
};

