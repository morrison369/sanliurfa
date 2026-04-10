import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa';

const signInMock = vi.fn();
const signUpMock = vi.fn();
const createTokenMock = vi.fn();
const queryOneMock = vi.fn();
const setCacheMock = vi.fn();
const checkRateLimitMock = vi.fn();
const recordRequestMock = vi.fn();
const loggerMock = {
  setRequestId: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  logAuth: vi.fn()
};

vi.mock('../../../lib/auth', () => ({
  signIn: signInMock,
  signUp: signUpMock,
  createToken: createTokenMock,
}));

vi.mock('../../../lib/postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../../../lib/cache', () => ({
  setCache: setCacheMock,
  checkRateLimit: checkRateLimitMock,
}));

vi.mock('../../../lib/logging', () => ({
  logger: loggerMock,
}));

vi.mock('../../../lib/metrics', () => ({
  recordRequest: recordRequestMock,
  isSlowRequest: vi.fn().mockReturnValue(false),
  metricsCollector: {
    recordSlowOperation: vi.fn()
  }
}));

describe('Auth API contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    checkRateLimitMock.mockResolvedValue(true);
    setCacheMock.mockResolvedValue(undefined);
    createTokenMock.mockResolvedValue('temp-2fa-token');
    queryOneMock.mockResolvedValue({ two_factor_enabled: false });
  });

  it('rejects non-json login payload', async () => {
    const { POST } = await import('../auth/login.ts');
    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });

    const response = await POST({
      request,
      cookies: { set: vi.fn() }
    } as any);

    expect(response.status).toBe(400);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('rate limits login endpoint', async () => {
    const { POST } = await import('../auth/login.ts');
    checkRateLimitMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'secret123' })
    });

    const response = await POST({
      request,
      cookies: { set: vi.fn() }
    } as any);

    expect(response.status).toBe(429);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('returns unauthorized for invalid credentials', async () => {
    const { POST } = await import('../auth/login.ts');
    signInMock.mockResolvedValueOnce({ data: null, error: { message: 'Invalid credentials' } });
    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'secret123' })
    });

    const response = await POST({
      request,
      cookies: { set: vi.fn() }
    } as any);

    expect(response.status).toBe(401);
  });

  it('returns 2fa challenge response when account requires 2fa', async () => {
    const { POST } = await import('../auth/login.ts');
    signInMock.mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', email: 'user@example.com', role: 'user' },
        token: 'jwt-token'
      },
      error: null
    });
    queryOneMock.mockResolvedValueOnce({ two_factor_enabled: true });
    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'secret123' })
    });

    const response = await POST({
      request,
      cookies: { set: vi.fn() }
    } as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.requiresTwoFactor).toBe(true);
    expect(payload.data.tempToken).toBe('temp-2fa-token');
    expect(setCacheMock).toHaveBeenCalled();
  });

  it('rejects non-json register payload', async () => {
    const { POST } = await import('../auth/register.ts');
    const request = new Request('https://example.com/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });

    const response = await POST({
      request,
      cookies: { set: vi.fn() }
    } as any);

    expect(response.status).toBe(400);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('rate limits register endpoint', async () => {
    const { POST } = await import('../auth/register.ts');
    checkRateLimitMock.mockResolvedValueOnce(false);
    const request = new Request('https://example.com/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'StrongPass1!',
        full_name: 'New User'
      })
    });

    const response = await POST({
      request,
      cookies: { set: vi.fn() }
    } as any);

    expect(response.status).toBe(429);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('rejects invalid register body by schema', async () => {
    const { POST } = await import('../auth/register.ts');
    const request = new Request('https://example.com/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'bad-email',
        password: '123',
        full_name: 'A'
      })
    });

    const response = await POST({
      request,
      cookies: { set: vi.fn() }
    } as any);

    expect(response.status).toBe(422);
    expect(signUpMock).not.toHaveBeenCalled();
  });
});
