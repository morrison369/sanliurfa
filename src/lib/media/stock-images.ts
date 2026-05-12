/**
 * Stock image fetcher — Pexels first, Unsplash fallback.
 * In-process cache with 24h TTL prevents repeated API calls per SSR render.
 */

import { getImageProvidersConfig } from './image-providers-config';
import { logger } from '../logging';

const _cache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function fromPexels(query: string, key: string): Promise<string | null> {
  if (!key) return null;
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: key } }
  );
  if (!res.ok) return null;
  const d = await res.json();
  return d?.photos?.[0]?.src?.large2x ?? d?.photos?.[0]?.src?.large ?? null;
}

async function fromUnsplash(query: string, key: string): Promise<string | null> {
  if (!key) return null;
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) return null;
  const d = await res.json();
  return d?.results?.[0]?.urls?.regular ?? null;
}

/**
 * Returns a landscape stock photo URL for `query`, or `null` when no keys are configured.
 * Results are cached in-process for 24 h.
 */
export async function getStockImage(query: string): Promise<string | null> {
  const k = query.trim().toLowerCase();
  if (!k) return null;

  const hit = _cache.get(k);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.url;

  try {
    const cfg = await getImageProvidersConfig();
    const url = (await fromPexels(k, cfg.pexels_api_key))
             ?? (await fromUnsplash(k, cfg.unsplash_access_key));

    if (url) _cache.set(k, { url, ts: Date.now() });
    return url ?? null;
  } catch {
    logger.warn('stock image fetch failed', { query: k });
    return null;
  }
}

/**
 * Parallel stock image fetch for multiple queries.
 * Returns a map from query → URL (missing results are omitted).
 */
export async function getStockImages(queries: string[]): Promise<Record<string, string>> {
  const pairs = await Promise.all(
    queries.map(async q => [q, await getStockImage(q)] as const)
  );
  return Object.fromEntries(pairs.filter(([, url]) => url !== null)) as Record<string, string>;
}
