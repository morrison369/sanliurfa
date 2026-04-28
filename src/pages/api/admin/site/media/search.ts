import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail, safeIntParam } from '../../../../../lib/api';
import { getImageProvidersConfig } from '../../../../../lib/media/image-providers-config';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

type Provider = 'unsplash' | 'pexels';

async function searchUnsplash(query: string, perPage: number, key: string) {
  if (!key) return [];
  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(endpoint, { headers: { Authorization: `Client-ID ${key}` } });
  if (!res.ok) throw new Error(`Unsplash error: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data?.results) ? data.results : []).map((img: any) => ({
    provider: 'unsplash',
    id: String(img.id),
    url: img?.urls?.regular || img?.urls?.full,
    thumb: img?.urls?.small || img?.urls?.thumb,
    author: img?.user?.name || '',
    authorUrl: img?.user?.links?.html || '',
  }));
}

async function searchPexels(query: string, perPage: number, key: string) {
  if (!key) return [];
  const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(endpoint, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels error: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data?.photos) ? data.photos : []).map((img: any) => ({
    provider: 'pexels',
    id: String(img.id),
    url: img?.src?.large2x || img?.src?.large || img?.src?.original,
    thumb: img?.src?.medium || img?.src?.small,
    author: img?.photographer || '',
    authorUrl: img?.photographer_url || '',
  }));
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const query = String(url.searchParams.get('q') || '').trim();
  const VALID_PROVIDERS = new Set(['all', 'unsplash', 'pexels']);
  const rawProvider = url.searchParams.get('provider') || 'all';
  const provider = VALID_PROVIDERS.has(rawProvider) ? rawProvider as Provider | 'all' : 'all';
  const perPage = safeIntParam(url.searchParams.get('limit'), 6, 1, 10);
  if (!query) return json({ error: 'q parametresi zorunlu' }, 400);
  if (query.length > 500) return json({ error: 'q 500 karakterden uzun olamaz' }, 400);

  try {
    const cfg = await getImageProvidersConfig();
    let results: { provider: string; id: string; url: string; thumb: string; author: string; authorUrl: string }[] = [];
    if (provider === 'all' || provider === 'pexels') {
      results = results.concat(await searchPexels(query, perPage, cfg.pexels_api_key));
    }
    if (provider === 'all' || provider === 'unsplash') {
      results = results.concat(await searchUnsplash(query, perPage, cfg.unsplash_access_key));
    }
    return json({ success: true, query, provider, count: results.length, results });
  } catch (error) {
    return json({ success: false, error: safeErrorDetail(error, 'search failed') }, 500);
  }
};
