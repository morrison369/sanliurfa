import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTRACT_TEST_IDS } from './helpers/contract-test-ids';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa';

const checkRateLimitMock = vi.fn();
const verifyOAuthStateMock = vi.fn();
const getOAuthProviderMock = vi.fn();
const generateOAuthStateMock = vi.fn();
const linkOAuthAccountMock = vi.fn();
const getOAuthAccountByProviderMock = vi.fn();
const createUserSessionMock = vi.fn();
const queryOneMock = vi.fn();
const recordRequestMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../../../lib/cache', () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock('../../../lib/oauth', () => ({
  verifyOAuthState: verifyOAuthStateMock,
  getOAuthProvider: getOAuthProviderMock,
  generateOAuthState: generateOAuthStateMock,
  linkOAuthAccount: linkOAuthAccountMock,
  getOAuthAccountByProvider: getOAuthAccountByProviderMock,
}));

vi.mock('../../../lib/security', () => ({
  createUserSession: createUserSessionMock,
}));

vi.mock('../../../lib/postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../../../lib/metrics', () => ({
  recordRequest: recordRequestMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

describe('OAuth API contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    checkRateLimitMock.mockResolvedValue(true);
    verifyOAuthStateMock.mockResolvedValue(null);
    getOAuthProviderMock.mockResolvedValue(null);
    generateOAuthStateMock.mockResolvedValue('state-token');
    getOAuthAccountByProviderMock.mockResolvedValue(null);
    createUserSessionMock.mockResolvedValue({ session_token: 'session-token' });
    queryOneMock.mockResolvedValue(null);
  });

  it('rejects oauth authorize when provider key format is invalid', async () => {
    const { GET } = await import('../auth/oauth/authorize.ts');
    const request = new Request('https://example.com/api/auth/oauth/authorize?provider=bad key');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(getOAuthProviderMock).not.toHaveBeenCalled();
  });

  it('rate limits oauth authorize endpoint', async () => {
    const { GET } = await import('../auth/oauth/authorize.ts');
    checkRateLimitMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/auth/oauth/authorize?provider=google');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(429);
    expect(getOAuthProviderMock).not.toHaveBeenCalled();
  });

  it('rejects oauth authorize when redirect_uri is not same-origin', async () => {
    const { GET } = await import('../auth/oauth/authorize.ts');
    const request = new Request(
      'https://example.com/api/auth/oauth/authorize?provider=google&redirect_uri=https://evil.example/callback'
    );

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(getOAuthProviderMock).not.toHaveBeenCalled();
    expect(generateOAuthStateMock).not.toHaveBeenCalled();
  });

  it('completes oauth authorize redirect for valid provider and redirect_uri', async () => {
    const { GET } = await import('../auth/oauth/authorize.ts');
    getOAuthProviderMock.mockResolvedValueOnce({
      provider_key: 'google',
      client_id: 'client-id',
      auth_url: 'https://accounts.example.com/oauth/authorize',
      scope: 'openid email profile'
    });
    generateOAuthStateMock.mockResolvedValueOnce('state-xyz');

    const request = new Request(
      'https://example.com/api/auth/oauth/authorize?provider=google&redirect_uri=https://example.com/api/auth/oauth/callback'
    );
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: { user: { id: CONTRACT_TEST_IDS.primaryUserId } },
    } as any);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location') || '';
    expect(location.startsWith('https://accounts.example.com/oauth/authorize?')).toBe(true);
    expect(location).toContain('client_id=client-id');
    expect(location).toContain(`state=${encodeURIComponent('state-xyz')}`);
  });

  it('builds oauth provider authorize redirect only for valid same-origin redirect_uri', async () => {
    const { GET } = await import('../auth/oauth/[provider].ts');
    const request = new Request(
      'https://example.com/api/auth/oauth/google?redirect_uri=https://example.com/api/auth/oauth/callback'
    );

    const response = await GET({
      params: { provider: 'google' },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location') || '';
    expect(location).toContain('/api/auth/oauth/authorize');
    expect(location).toContain('provider=google');
    expect(location).toContain(encodeURIComponent('https://example.com/api/auth/oauth/callback'));
  });

  it('rejects oauth provider redirect when redirect_uri is external', async () => {
    const { GET } = await import('../auth/oauth/[provider].ts');
    const request = new Request(
      'https://example.com/api/auth/oauth/google?redirect_uri=https://evil.example/callback'
    );

    const response = await GET({
      params: { provider: 'google' },
      url: new URL(request.url),
    } as any);

    expect(response.status).toBe(400);
  });

  it('rejects oauth callback when provider config is incomplete', async () => {
    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'https://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id'
    });

    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc&state=state-1');
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(404);
    expect(createUserSessionMock).not.toHaveBeenCalled();
  });

  it('rate limits oauth callback endpoint', async () => {
    const { GET } = await import('../auth/oauth/callback.ts');
    checkRateLimitMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc&state=state-1');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(429);
    expect(verifyOAuthStateMock).not.toHaveBeenCalled();
  });

  it('rejects oauth callback when code or state is missing', async () => {
    const { GET } = await import('../auth/oauth/callback.ts');
    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc');

    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(verifyOAuthStateMock).not.toHaveBeenCalled();
  });

  it('rejects oauth callback when provider returns no email and no linked account exists', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'provider-user' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'https://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id',
      client_secret: 'client-secret',
      authorization_url: 'https://example.com/oauth/authorize',
      token_url: 'https://example.com/oauth/token',
      userinfo_url: 'https://example.com/oauth/userinfo'
    });

    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc&state=state-1');
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(linkOAuthAccountMock).not.toHaveBeenCalled();
  });

  it('rejects oauth callback when token exchange fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'https://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id',
      client_secret: 'client-secret',
      authorization_url: 'https://example.com/oauth/authorize',
      token_url: 'https://example.com/oauth/token',
      userinfo_url: 'https://example.com/oauth/userinfo'
    });

    const request = new Request('https://example.com/api/auth/oauth/callback?code=abc&state=state-1');
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(400);
    expect(createUserSessionMock).not.toHaveBeenCalled();
  });

  it('completes oauth callback and sets non-secure cookie on http origin', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'provider-user',
        email: 'oauth@example.com',
        name: 'OAuth User'
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'http://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id',
      client_secret: 'client-secret',
      authorization_url: 'https://example.com/oauth/authorize',
      token_url: 'https://example.com/oauth/token',
      userinfo_url: 'https://example.com/oauth/userinfo'
    });
    queryOneMock.mockResolvedValueOnce({ id: CONTRACT_TEST_IDS.primaryUserId });

    const request = new Request('http://example.com/api/auth/oauth/callback?code=abc&state=state-1', {
      headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '127.0.0.1' }
    });
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    const setCookie = response.headers.get('Set-Cookie') || '';
    expect(setCookie).toContain('auth-token=session-token');
    expect(setCookie).not.toContain('Secure');
    expect(linkOAuthAccountMock).toHaveBeenCalled();
    expect(createUserSessionMock).toHaveBeenCalled();
  });

  it('sets secure cookie when request is behind https proxy', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'provider-user',
        email: 'oauth@example.com',
        name: 'OAuth User'
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('../auth/oauth/callback.ts');
    verifyOAuthStateMock.mockResolvedValue({
      provider_key: 'google',
      redirect_uri: 'http://example.com/api/auth/oauth/callback'
    });
    getOAuthProviderMock.mockResolvedValue({
      provider_key: 'google',
      client_id: 'client-id',
      client_secret: 'client-secret',
      authorization_url: 'https://example.com/oauth/authorize',
      token_url: 'https://example.com/oauth/token',
      userinfo_url: 'https://example.com/oauth/userinfo'
    });
    queryOneMock.mockResolvedValueOnce({ id: CONTRACT_TEST_IDS.primaryUserId });

    const request = new Request('http://example.com/api/auth/oauth/callback?code=abc&state=state-1', {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '127.0.0.1',
        'x-forwarded-proto': 'https'
      }
    });
    const response = await GET({
      request,
      url: new URL(request.url),
      locals: {},
    } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Set-Cookie') || '').toContain('Secure');
  });
});
