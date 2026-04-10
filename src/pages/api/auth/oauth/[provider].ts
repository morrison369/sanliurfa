import type { APIRoute } from 'astro';

const PROVIDER_KEY_REGEX = /^[a-z0-9_-]{2,50}$/;

function resolveRedirectUri(rawRedirectUri: string, currentUrl: URL): string | null {
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

export const GET: APIRoute = async ({ params, url }) => {
  const provider = params.provider?.trim().toLowerCase();

  if (!provider || !PROVIDER_KEY_REGEX.test(provider)) {
    return new Response(JSON.stringify({ error: 'Provider required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const redirectUrl = new URL('/api/auth/oauth/authorize', url);
  redirectUrl.searchParams.set('provider', provider);

  const redirectUri = url.searchParams.get('redirect_uri');
  if (redirectUri) {
    const safeRedirectUri = resolveRedirectUri(redirectUri, url);
    if (!safeRedirectUri) {
      return new Response(JSON.stringify({ error: 'Invalid redirect_uri' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    redirectUrl.searchParams.set('redirect_uri', safeRedirectUri);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
      'Cache-Control': 'no-store'
    }
  });
};
