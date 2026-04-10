import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, url }) => {
  const provider = params.provider?.trim().toLowerCase();

  if (!provider) {
    return new Response(JSON.stringify({ error: 'Provider required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const redirectUrl = new URL('/api/auth/oauth/authorize', url);
  redirectUrl.searchParams.set('provider', provider);

  const redirectUri = url.searchParams.get('redirect_uri');
  if (redirectUri) {
    redirectUrl.searchParams.set('redirect_uri', redirectUri);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
      'Cache-Control': 'no-store'
    }
  });
};
