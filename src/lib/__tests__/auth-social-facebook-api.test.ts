import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApiContext } from './helpers/api-test-helpers';
import { GET } from '../../pages/api/auth/social/facebook';

describe('auth social facebook api', () => {
  const originalAppId = process.env.FACEBOOK_APP_ID;
  const originalAppSecret = process.env.FACEBOOK_APP_SECRET;

  beforeEach(() => {
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
  });

  afterEach(() => {
    if (originalAppId === undefined) {
      delete process.env.FACEBOOK_APP_ID;
    } else {
      process.env.FACEBOOK_APP_ID = originalAppId;
    }

    if (originalAppSecret === undefined) {
      delete process.env.FACEBOOK_APP_SECRET;
    } else {
      process.env.FACEBOOK_APP_SECRET = originalAppSecret;
    }
  });

  it('returns problem+json when facebook oauth env is missing', async () => {
    const response = await GET(createApiContext({ url: 'http://localhost:4321/api/auth/social/facebook' }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(body?.title).toContain('Facebook OAuth');
    expect(body?.provider).toBe('facebook');
  });

  it('redirects to oauth authorize endpoint when env exists', async () => {
    process.env.FACEBOOK_APP_ID = 'app-id';
    process.env.FACEBOOK_APP_SECRET = 'app-secret';

    const response = await GET(
      createApiContext({
        url: 'http://localhost:4321/api/auth/social/facebook?redirect_uri=http://localhost:4321/api/auth/oauth/callback',
      })
    );

    const location = response.headers.get('location');

    expect(response.status).toBe(302);
    expect(location).toContain('/api/auth/oauth/authorize');
    expect(location).toContain('provider=facebook');
    expect(location).toContain('redirect_uri=');
  });
});

