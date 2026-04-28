import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock postgres + site_settings helpers BEFORE importing handlers, since each handler
// captures these references at module-load time.
vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  pool: { query: vi.fn() },
}));

vi.mock('../site-content', () => ({
  getSiteSetting: vi.fn(),
  upsertSiteSetting: vi.fn(),
}));

vi.mock('../oauth/oauth-providers-helper', () => ({
  listOAuthProvidersForAdmin: vi.fn().mockResolvedValue([]),
  upsertOAuthProviderFromAdmin: vi.fn().mockResolvedValue(undefined),
  OAUTH_PROVIDER_PRESETS: {
    google: { provider_key: 'google', provider_name: 'Google', auth_url: 'https://x', token_url: 'https://y', userinfo_url: 'https://z', scope: 'openid' },
  },
}));

vi.mock('../stripe/stripe-config', () => ({
  invalidateStripeConfigCache: vi.fn(),
}));

vi.mock('../media/image-providers-config', () => ({
  invalidateImageProvidersCache: vi.fn(),
}));

vi.mock('../email', () => ({
  invalidateEmailConfigCache: vi.fn(),
}));

import { GET, POST } from '../../pages/api/admin/site/integrations';
import { getSiteSetting, upsertSiteSetting } from '../site-content';
import { invalidateEmailConfigCache } from '../email';
import { createApiContext, parseJson } from './helpers';

const mockedGetSetting = getSiteSetting as unknown as ReturnType<typeof vi.fn>;
const mockedUpsert = upsertSiteSetting as unknown as ReturnType<typeof vi.fn>;
const mockedInvalidateEmail = invalidateEmailConfigCache as unknown as ReturnType<typeof vi.fn>;

const adminLocals = {
  user: { id: 'u1', email: 'admin@x.com', fullName: 'A', role: 'admin' as const, avatar: null, points: 0 },
  isAdmin: true,
  isAuthenticated: true,
};

describe('GET /api/admin/site/integrations', () => {
  beforeEach(() => {
    mockedGetSetting.mockReset();
    mockedUpsert.mockReset();
  });

  it('rejects non-admin requests with 401', async () => {
    const ctx = createApiContext({ method: 'GET', locals: { user: null, isAdmin: false, isAuthenticated: false } });
    const res = await GET(ctx);
    expect(res.status).toBe(401);
  });

  it('returns email.daily_limit_per_recipient field with default 10 when DB has no setting', async () => {
    mockedGetSetting.mockResolvedValue({}); // empty settings for all keys
    const ctx = createApiContext({ method: 'GET', locals: adminLocals });
    const res = await GET(ctx);
    const body = await parseJson(res);
    expect(body.data.data.email.daily_limit_per_recipient).toBe(10);
  });

  it('returns custom daily_limit_per_recipient when DB has it set', async () => {
    mockedGetSetting.mockImplementation((key: string) => {
      if (key === 'integrations.email') {
        return Promise.resolve({ api_key: 're_x', from_email: 'a@x.com', daily_limit_per_recipient: 50 });
      }
      return Promise.resolve({});
    });
    const ctx = createApiContext({ method: 'GET', locals: adminLocals });
    const res = await GET(ctx);
    const body = await parseJson(res);
    expect(body.data.data.email.daily_limit_per_recipient).toBe(50);
    expect(body.data.data.email.api_key_set).toBe(true);
  });
});

describe('POST /api/admin/site/integrations { section: "email" }', () => {
  beforeEach(() => {
    mockedGetSetting.mockReset();
    mockedUpsert.mockReset();
    mockedInvalidateEmail.mockReset();
  });

  it('persists daily_limit_per_recipient as a number (not string)', async () => {
    mockedGetSetting.mockResolvedValueOnce({}); // current = empty
    mockedUpsert.mockResolvedValueOnce(undefined);

    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email', daily_limit_per_recipient: '25', from_email: 'noreply@x.com' },
      locals: adminLocals,
    });
    const res = await POST(ctx);
    const body = await parseJson(res);
    expect(body.data.success).toBe(true);
    expect(mockedUpsert).toHaveBeenCalledWith(
      'integrations.email',
      expect.objectContaining({ daily_limit_per_recipient: 25, from_email: 'noreply@x.com' }),
      expect.any(String),
      'u1',
    );
    expect(mockedInvalidateEmail).toHaveBeenCalledTimes(1);
  });

  it('accepts 0 as a valid limit (rate limiting disabled)', async () => {
    mockedGetSetting.mockResolvedValueOnce({});
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email', daily_limit_per_recipient: '0' },
      locals: adminLocals,
    });
    await POST(ctx);
    expect(mockedUpsert).toHaveBeenCalledWith(
      'integrations.email',
      expect.objectContaining({ daily_limit_per_recipient: 0 }),
      expect.any(String),
      'u1',
    );
  });

  it('ignores negative daily_limit_per_recipient (clamped by skipping)', async () => {
    mockedGetSetting.mockResolvedValueOnce({ api_key: 're_existing', daily_limit_per_recipient: 10 });
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email', daily_limit_per_recipient: '-5' },
      locals: adminLocals,
    });
    await POST(ctx);
    // Negative skipped → existing 10 preserved (current value spread)
    const call = mockedUpsert.mock.calls[0];
    const persistedLimit = (call[1] as { daily_limit_per_recipient?: number }).daily_limit_per_recipient;
    expect(persistedLimit).toBe(10); // unchanged
  });

  it('preserves existing api_key when input contains masked placeholder ****', async () => {
    mockedGetSetting.mockResolvedValueOnce({ api_key: 're_real_existing_key' });
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email', api_key: 're_a****xyz' }, // user re-submitted masked GET value
      locals: adminLocals,
    });
    await POST(ctx);
    const call = mockedUpsert.mock.calls[0];
    expect((call[1] as { api_key?: string }).api_key).toBe('re_real_existing_key');
  });

  it('invalidates email config cache so next sendEmail() picks up new key', async () => {
    mockedGetSetting.mockResolvedValueOnce({});
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email', api_key: 're_brand_new_key', from_email: 'new@x.com' },
      locals: adminLocals,
    });
    await POST(ctx);
    expect(mockedInvalidateEmail).toHaveBeenCalledTimes(1);
  });
});
