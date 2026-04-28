import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock('../cache', () => ({
  getCache: vi.fn().mockResolvedValue(0),
  setCache: vi.fn().mockResolvedValue(undefined),
}));

// Track sendMail invocations across tests.
const sendMailMock = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { sendEmail, invalidateEmailConfigCache } from '../email';
import { queryOne } from '../postgres';

const mockedQueryOne = queryOne as unknown as ReturnType<typeof vi.fn>;

describe('SMTP fallback (tier 2) — DB-managed config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    invalidateEmailConfigCache();
    mockedQueryOne.mockReset();
    fetchMock.mockReset();
    sendMailMock.mockReset();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falls back to SMTP via DB config when Resend has no api_key', async () => {
    // Tier 1 Resend: empty (no api_key)
    mockedQueryOne.mockResolvedValueOnce(null);
    // Tier 2 SMTP: full DB config
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        user: 'mailer@example.com',
        pass: 'secret-pass',
        from_email: 'noreply@example.com',
      },
    });
    sendMailMock.mockResolvedValueOnce({ messageId: 'abc123' });

    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled(); // Resend skipped
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 't@x.com',
        subject: 's',
        from: expect.stringContaining('noreply@example.com'),
      }),
    );
  });

  it('falls back to SMTP when Resend HTTP fails', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_production_key', from_email: 'a@x.com' },
    });
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { host: 'smtp.x.com', port: 587, user: 'u', pass: 'p', from_email: 'a@x.com' },
    });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('"server error"'),
    } as Response);
    sendMailMock.mockResolvedValueOnce({ messageId: 'fallback-id' });

    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it('SMTP missing required fields (no host/user/pass) → tier 3 dev log', async () => {
    mockedQueryOne.mockResolvedValueOnce(null); // no Resend
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { host: '', user: '', pass: '' }, // empty SMTP
    });

    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    expect(result.success).toBe(true);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('SMTP env values used when DB has no row (env fallback chain)', async () => {
    process.env.SMTP_HOST = 'env-smtp.x.com';
    process.env.SMTP_USER = 'env-user';
    process.env.SMTP_PASS = 'env-pass';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SECURE = 'true';

    mockedQueryOne.mockResolvedValueOnce(null); // no Resend
    mockedQueryOne.mockResolvedValueOnce(null); // no SMTP DB row
    sendMailMock.mockResolvedValueOnce({ messageId: 'env-fallback' });

    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    expect(result.success).toBe(true);
    expect(sendMailMock).toHaveBeenCalled();
  });

  it('SMTP cache shared with Resend cache invalidation', async () => {
    // First call populates SMTP cache from DB
    mockedQueryOne.mockResolvedValueOnce(null); // Resend empty
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { host: 'a.smtp.com', port: 587, user: 'u', pass: 'p1', from_email: 'a@x.com' },
    });
    sendMailMock.mockResolvedValue({ messageId: 'm1' });
    await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });
    expect(mockedQueryOne).toHaveBeenCalledTimes(2);

    // Without invalidation, second send hits cache (no new DB queries)
    mockedQueryOne.mockClear();
    await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });
    expect(mockedQueryOne).toHaveBeenCalledTimes(0);

    // After invalidation, both Resend and SMTP read DB again
    invalidateEmailConfigCache();
    mockedQueryOne.mockResolvedValueOnce(null);
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { host: 'b.smtp.com', port: 587, user: 'u', pass: 'p2-rotated', from_email: 'a@x.com' },
    });
    await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });
    expect(mockedQueryOne).toHaveBeenCalledTimes(2);
  });
});
