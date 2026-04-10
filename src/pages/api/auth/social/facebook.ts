import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const redirectUrl = new URL('/api/auth/oauth/facebook', url);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.toString(),
      'Cache-Control': 'no-store'
    }
  });
};
