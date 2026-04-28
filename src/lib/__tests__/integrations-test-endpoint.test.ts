import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock('../cache', () => ({
  getCache: vi.fn().mockResolvedValue(0),
  setCache: vi.fn().mockResolvedValue(undefined),
}));

const sendMailMock = vi.fn();
const verifyMock = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: sendMailMock, verify: verifyMock })) },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { POST } from '../../pages/api/admin/site/integrations/test';
import { createApiContext, parseJson } from './helpers';
import { invalidateEmailConfigCache } from '../email';
import { invalidateImageProvidersCache } from '../media/image-providers-config';
import { invalidateStripeConfigCache } from '../stripe/stripe-config';
import { queryOne } from '../postgres';

const mockedQueryOne = queryOne as unknown as ReturnType<typeof vi.fn>;

describe('POST /api/admin/site/integrations/test', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.UNSPLASH_ACCESS_KEY;
    delete process.env.PEXELS_API_KEY;
    invalidateEmailConfigCache();
    invalidateImageProvidersCache();
    invalidateStripeConfigCache();
    mockedQueryOne.mockReset();
    fetchMock.mockReset();
    sendMailMock.mockReset();
    verifyMock.mockReset();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects non-admin requests with 401', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email' },
      locals: { user: null, isAdmin: false, isAuthenticated: false },
    });
    const res = await POST(ctx);
    expect(res.status).toBe(401);
  });

  it('email section sends test email to admin and reports success', async () => {
    // Resend tier with real key
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_test_key_xyz', from_email: 'noreply@x.com' },
    });
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email' },
      locals: {
        user: { id: '1', email: 'admin@example.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);

    expect(data.data.success).toBe(true);
    expect(data.data.message).toContain('admin@example.com');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('email section response includes tier so admin sees which backend handled the send', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_production_key_here', from_email: 'noreply@x.com' },
    });
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email' },
      locals: {
        user: { id: '1', email: 'admin@example.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);

    expect(data.data.success).toBe(true);
    expect(data.data.tier).toBe('resend');
    expect(data.data.message).toContain('Resend ile');
  });

  it('email section reports failure when admin has no email', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'email' },
      locals: {
        user: { id: '1', email: '', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    expect(res.status).toBe(400);
    const data = await parseJson(res);
    expect(data.data.success).toBe(false);
  });

  it('payment section reports failure when stripe secret_key not configured', async () => {
    mockedQueryOne.mockResolvedValueOnce(null); // no DB row, no env
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'payment' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    expect(res.status).toBe(400);
    const data = await parseJson(res);
    expect(data.data.success).toBe(false);
    expect(data.data.message).toContain('secret_key');
  });

  it('image_providers section reports failure when none configured', async () => {
    mockedQueryOne.mockResolvedValueOnce(null);
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'image_providers' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    expect(res.status).toBe(400);
    const data = await parseJson(res);
    expect(data.data.success).toBe(false);
  });

  it('image_providers section probes Pexels when only Pexels is configured', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { pexels_api_key: 'pexels-real-key' },
    });
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'image_providers' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);
    expect(data.data.success).toBe(true);
    expect(data.data.message).toContain('Pexels');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('api.pexels.com'),
      expect.any(Object),
    );
  });

  it('smtp section reports failure when SMTP not configured', async () => {
    mockedQueryOne.mockResolvedValueOnce(null); // empty SMTP DB
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'smtp' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);
    expect(data.data.success).toBe(false);
    expect(data.data.message).toContain('yapılandırılmamış');
  });

  it('smtp section probes nodemailer.verify() when configured', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { host: 'smtp.x.com', port: 587, user: 'u', pass: 'p', from_email: 'a@x.com' },
    });
    verifyMock.mockResolvedValueOnce(true);

    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'smtp' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);
    expect(data.data.success).toBe(true);
    expect(data.data.message).toContain('smtp.x.com');
    expect(verifyMock).toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled(); // probe only, no send
  });

  it('smtp section reports auth failure cleanly', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { host: 'smtp.x.com', port: 587, user: 'u', pass: 'wrong', from_email: 'a@x.com' },
    });
    verifyMock.mockRejectedValueOnce(new Error('535 Authentication failed'));

    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'smtp' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);
    expect(data.data.success).toBe(false);
    expect(data.data.message).toContain('Authentication failed');
  });

  it('oauth section rejects unknown provider_key with 400', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'oauth', provider_key: 'tinder' }, // not in presets
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    expect(res.status).toBe(400);
    const data = await parseJson(res);
    expect(data.data.message).toContain('Bilinmeyen provider_key');
  });

  it('oauth section reports failure when client_id/secret not configured in DB', async () => {
    mockedQueryOne.mockResolvedValueOnce(null); // no DB row
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'oauth', provider_key: 'google' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    expect(res.status).toBe(400);
    const data = await parseJson(res);
    expect(data.data.success).toBe(false);
    expect(data.data.message).toContain('client_id veya client_secret yapılandırılmamış');
  });

  it('oauth section probes auth_url with HEAD when fully configured', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      client_id: 'gcid',
      client_secret: 'gsecret',
      is_enabled: true,
    });
    fetchMock.mockResolvedValueOnce({ status: 200 } as Response);

    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'oauth', provider_key: 'google' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);
    expect(data.data.success).toBe(true);
    expect(data.data.message).toContain('Google');
    expect(data.data.message).toContain('etkin');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('accounts.google.com'),
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('analytics section rejects unconfigured GA ID with 400', async () => {
    mockedQueryOne.mockResolvedValueOnce(null); // no analytics row
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'analytics' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    expect(res.status).toBe(400);
    const data = await parseJson(res);
    expect(data.data.success).toBe(false);
  });

  it('analytics section rejects malformed GA ID', async () => {
    mockedQueryOne.mockResolvedValueOnce({ setting_value: { ga_id: 'UA-12345-1' } }); // legacy GA, not GA4
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'analytics' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);
    expect(data.data.success).toBe(false);
    expect(data.data.message).toContain('formatı geçersiz');
  });

  it('analytics section accepts properly formatted GA4 ID', async () => {
    mockedQueryOne.mockResolvedValueOnce({ setting_value: { ga_id: 'G-AB12CD34EF' } });
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'analytics' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    const data = await parseJson(res);
    expect(data.data.success).toBe(true);
    expect(data.data.message).toContain('G-AB12CD34EF');
  });

  it('rejects unknown section with 400', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { section: 'unknown' },
      locals: {
        user: { id: '1', email: 'a@x.com', fullName: 'A', role: 'admin', avatar: null, points: 0 },
        isAdmin: true,
        isAuthenticated: true,
      },
    });
    const res = await POST(ctx);
    expect(res.status).toBe(400);
    const data = await parseJson(res);
    expect(data.data.message).toContain('Bilinmeyen section');
  });
});
