import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock postgres BEFORE importing the module under test, since the module captures
// `queryOne` at import time via its `import { queryOne }` statement.
vi.mock('../postgres', () => ({
  queryOne: vi.fn(),
}));

import { getStripeConfig, invalidateStripeConfigCache } from '../stripe/stripe-config';
import { queryOne } from '../postgres';

const mockedQueryOne = queryOne as unknown as ReturnType<typeof vi.fn>;

describe('getStripeConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    invalidateStripeConfigCache();
    mockedQueryOne.mockReset();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns DB values when site_settings.integrations.payment is populated', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: {
        secret_key: 'sk_db_secret',
        publishable_key: 'pk_db_pub',
        webhook_secret: 'whsec_db',
      },
    });
    const cfg = await getStripeConfig();
    expect(cfg.secret_key).toBe('sk_db_secret');
    expect(cfg.publishable_key).toBe('pk_db_pub');
    expect(cfg.webhook_secret).toBe('whsec_db');
  });

  it('falls back to env vars when DB has no row', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_env_secret';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_env_pub';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_env';
    mockedQueryOne.mockResolvedValueOnce(null);
    const cfg = await getStripeConfig();
    expect(cfg.secret_key).toBe('sk_env_secret');
    expect(cfg.publishable_key).toBe('pk_env_pub');
    expect(cfg.webhook_secret).toBe('whsec_env');
  });

  it('falls back to env when DB query throws (DB unavailable)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_env_only';
    mockedQueryOne.mockRejectedValueOnce(new Error('connection refused'));
    const cfg = await getStripeConfig();
    expect(cfg.secret_key).toBe('sk_env_only');
  });

  it('returns empty strings when neither DB nor env have any value', async () => {
    mockedQueryOne.mockResolvedValueOnce(null);
    const cfg = await getStripeConfig();
    expect(cfg.secret_key).toBe('');
    expect(cfg.publishable_key).toBe('');
    expect(cfg.webhook_secret).toBe('');
  });

  it('caches the result so a second call within TTL does not hit the DB', async () => {
    mockedQueryOne.mockResolvedValueOnce({ setting_value: { secret_key: 'sk_v1' } });
    await getStripeConfig();
    await getStripeConfig();
    await getStripeConfig();
    expect(mockedQueryOne).toHaveBeenCalledTimes(1);
  });

  it('invalidateStripeConfigCache forces the next call to hit the DB again', async () => {
    mockedQueryOne.mockResolvedValueOnce({ setting_value: { secret_key: 'sk_v1' } });
    const first = await getStripeConfig();
    expect(first.secret_key).toBe('sk_v1');

    invalidateStripeConfigCache();
    mockedQueryOne.mockResolvedValueOnce({ setting_value: { secret_key: 'sk_v2_rotated' } });
    const second = await getStripeConfig();
    expect(second.secret_key).toBe('sk_v2_rotated');
    expect(mockedQueryOne).toHaveBeenCalledTimes(2);
  });

  it('DB value with falsy fields still falls through to env', async () => {
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_env_fallback';
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { secret_key: 'sk_db', publishable_key: '' },
    });
    const cfg = await getStripeConfig();
    expect(cfg.secret_key).toBe('sk_db');
    expect(cfg.publishable_key).toBe('pk_env_fallback');
  });
});
