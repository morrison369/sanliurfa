import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../postgres', () => ({
  queryOne: vi.fn(),
}));

import {
  getImageProvidersConfig,
  invalidateImageProvidersCache,
} from '../media/image-providers-config';
import { queryOne } from '../postgres';

const mockedQueryOne = queryOne as unknown as ReturnType<typeof vi.fn>;

describe('getImageProvidersConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    delete process.env.PEXELS_API_KEY;
    invalidateImageProvidersCache();
    mockedQueryOne.mockReset();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns DB values when site_settings.integrations.image_providers is set', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: {
        unsplash_access_key: 'unsplash_db_key',
        pexels_api_key: 'pexels_db_key',
      },
    });
    const cfg = await getImageProvidersConfig();
    expect(cfg.unsplash_access_key).toBe('unsplash_db_key');
    expect(cfg.pexels_api_key).toBe('pexels_db_key');
  });

  it('falls back to env vars when DB has no row', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'unsplash_env';
    process.env.PEXELS_API_KEY = 'pexels_env';
    mockedQueryOne.mockResolvedValueOnce(null);
    const cfg = await getImageProvidersConfig();
    expect(cfg.unsplash_access_key).toBe('unsplash_env');
    expect(cfg.pexels_api_key).toBe('pexels_env');
  });

  it('returns empty strings when both DB and env are empty (search degrades gracefully)', async () => {
    mockedQueryOne.mockResolvedValueOnce(null);
    const cfg = await getImageProvidersConfig();
    expect(cfg.unsplash_access_key).toBe('');
    expect(cfg.pexels_api_key).toBe('');
  });

  it('caches across calls within the TTL window', async () => {
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { unsplash_access_key: 'k1' },
    });
    await getImageProvidersConfig();
    await getImageProvidersConfig();
    expect(mockedQueryOne).toHaveBeenCalledTimes(1);
  });

  it('invalidateImageProvidersCache forces a fresh DB read', async () => {
    mockedQueryOne.mockResolvedValueOnce({ setting_value: { unsplash_access_key: 'k1' } });
    const first = await getImageProvidersConfig();
    expect(first.unsplash_access_key).toBe('k1');

    invalidateImageProvidersCache();
    mockedQueryOne.mockResolvedValueOnce({ setting_value: { unsplash_access_key: 'k2' } });
    const second = await getImageProvidersConfig();
    expect(second.unsplash_access_key).toBe('k2');
  });

  it('returns env fallback per-field when DB only has one provider configured', async () => {
    process.env.PEXELS_API_KEY = 'pexels_env_only';
    mockedQueryOne.mockResolvedValueOnce({
      setting_value: { unsplash_access_key: 'unsplash_db_only' },
    });
    const cfg = await getImageProvidersConfig();
    expect(cfg.unsplash_access_key).toBe('unsplash_db_only');
    expect(cfg.pexels_api_key).toBe('pexels_env_only');
  });
});
