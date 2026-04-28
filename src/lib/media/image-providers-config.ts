/**
 * Image Providers Configuration Resolver
 *
 * Reads Unsplash and Pexels API credentials from `site_settings.integrations.image_providers`
 * (admin-managed) and falls back to environment variables. Cached for 60s.
 *
 * Used by /api/admin/site/media/search to query free stock photo providers.
 */

import { queryOne } from '../postgres';

export interface ImageProvidersConfig {
  unsplash_access_key: string;
  pexels_api_key: string;
}

let _cache: ImageProvidersConfig | null = null;
let _cacheAt = 0;

const CACHE_TTL_MS = 60_000;

export async function getImageProvidersConfig(): Promise<ImageProvidersConfig> {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) return _cache;

  let dbValue: Partial<ImageProvidersConfig> = {};
  try {
    const row = await queryOne<{ setting_value: Partial<ImageProvidersConfig> }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.image_providers'`,
      [],
    );
    dbValue = row?.setting_value || {};
  } catch {
    dbValue = {};
  }

  _cache = {
    unsplash_access_key: dbValue.unsplash_access_key || process.env.UNSPLASH_ACCESS_KEY || '',
    pexels_api_key: dbValue.pexels_api_key || process.env.PEXELS_API_KEY || '',
  };
  _cacheAt = now;
  return _cache;
}

export function invalidateImageProvidersCache(): void {
  _cache = null;
  _cacheAt = 0;
}
