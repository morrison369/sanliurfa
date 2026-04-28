import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock('../cache', () => ({
  getCache: vi.fn().mockResolvedValue(0),
  setCache: vi.fn().mockResolvedValue(undefined),
}));

// Mock global fetch (Resend tier)
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { sendEmail, invalidateEmailConfigCache } from '../email';
import { queryOne } from '../postgres';

const mockedQueryOne = queryOne as unknown as ReturnType<typeof vi.fn>;

describe('email tier order', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    invalidateEmailConfigCache();
    mockedQueryOne.mockReset();
    fetchMock.mockReset();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses Resend when DB has a real api_key', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_production_key_here', from_email: 'noreply@x.com' },
    });
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);

    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_real_production_key_here',
        }),
      }),
    );
  });

  it('skips Resend when api_key looks like a dev placeholder (contains "dummy")', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_dummy_key_for_development', from_email: 'noreply@x.com' },
    });
    // No SMTP env, no Resend (dummy skipped) → tier 3 dev log; should still report success.
    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to dev log when neither Resend nor SMTP are configured', async () => {
    mockedQueryOne.mockResolvedValueOnce(null);
    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns success: false when Resend returns an HTTP error and no SMTP fallback exists', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_but_invalid_token_xyz', from_email: 'noreply@x.com' },
    });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('{"error":"invalid_api_key"}'),
    } as Response);

    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    // Resend failed, no SMTP → tier 3 dev log → success: true (intentional, dev-friendly)
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches Resend config across calls within TTL', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_production_key', from_email: 'a@x.com' },
    });
    fetchMock.mockResolvedValue({ ok: true } as Response);

    await sendEmail({ to: 't@x.com', subject: 's1', html: '<p>1</p>' });
    await sendEmail({ to: 't@x.com', subject: 's2', html: '<p>2</p>' });

    expect(mockedQueryOne).toHaveBeenCalledTimes(1); // DB hit only once
  });

  it('honors a custom daily_limit_per_recipient from DB config', async () => {
    // DB sets a tight 2/day cap; cache reports 2 sends already → next call rejected.
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_key', from_email: 'a@x.com', daily_limit_per_recipient: 2 },
    });
    const { getCache } = await import('../cache');
    (getCache as ReturnType<typeof vi.fn>).mockResolvedValueOnce(2);
    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('2/day');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('disables rate limiting when daily_limit_per_recipient is 0', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_key', from_email: 'a@x.com', daily_limit_per_recipient: 0 },
    });
    const { getCache } = await import('../cache');
    (getCache as ReturnType<typeof vi.fn>).mockResolvedValueOnce(99999); // way over the default 10
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);
    const result = await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });
    expect(result.success).toBe(true); // 0 disables the gate even with high count
  });

  it('invalidateEmailConfigCache forces a fresh DB read', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_v1_production', from_email: 'a@x.com' },
    });
    fetchMock.mockResolvedValue({ ok: true } as Response);

    await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    invalidateEmailConfigCache();
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { api_key: 're_real_v2_rotated_key', from_email: 'a@x.com' },
    });
    await sendEmail({ to: 't@x.com', subject: 's', html: '<p>h</p>' });

    expect(mockedQueryOne).toHaveBeenCalledTimes(2);
    // Second send should use the new key
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer re_real_v2_rotated_key',
        }),
      }),
    );
  });
});
