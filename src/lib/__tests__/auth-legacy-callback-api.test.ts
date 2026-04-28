import { describe, expect, it } from 'vitest';
import { GET } from '../../pages/api/auth/callback';

function createLegacyCallbackContext(rawUrl: string) {
  const url = new URL(rawUrl);
  return {
    url,
    request: new Request(url.toString()),
    redirect: (location: string, status: number = 302) =>
      new Response(null, {
        status,
        headers: {
          Location: location,
        },
      }),
  } as any;
}

describe('legacy oauth callback api', () => {
  it('redirects to login when code is missing', async () => {
    const response = await GET(createLegacyCallbackContext('http://localhost:4321/api/auth/callback'));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/giris?error=no_code');
  });

  it('redirects to login when state is missing', async () => {
    const response = await GET(
      createLegacyCallbackContext('http://localhost:4321/api/auth/callback?code=abc123&provider=facebook')
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/giris?error=oauth_state_required');
  });

  it('forwards to modern oauth callback when state and code exist', async () => {
    const response = await GET(
      createLegacyCallbackContext(
        'http://localhost:4321/api/auth/callback?code=abc123&state=state123&provider=facebook'
      )
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      '/api/auth/oauth/callback?code=abc123&state=state123&provider=facebook'
    );
  });
});

