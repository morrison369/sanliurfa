import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, url }) => {
  const redirectUrl = new URL('/api/auth/oauth/callback', url);
  redirectUrl.search = url.search;

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
      'Cache-Control': 'no-store',
      'X-Legacy-Route': '/api/auth/callback'
    }
  });
};
