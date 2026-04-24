import type { APIRoute } from 'astro';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(locals: any) {
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

type Provider = 'unsplash' | 'pexels';

async function searchUnsplash(query: string, perPage: number) {
  const key = process.env.UNSPLASH_ACCESS_KEY || import.meta.env.UNSPLASH_ACCESS_KEY;
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

async function searchPexels(query: string, perPage: number) {
  const key = process.env.PEXELS_API_KEY || import.meta.env.PEXELS_API_KEY;
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
  const provider = (url.searchParams.get('provider') || 'all') as Provider | 'all';
  const perPage = Math.max(1, Math.min(10, Number(url.searchParams.get('limit') || 6)));
  if (!query) return json({ error: 'q parametresi zorunlu' }, 400);

  try {
    let results: any[] = [];
    if (provider === 'all' || provider === 'pexels') {
      results = results.concat(await searchPexels(query, perPage));
    }
    if (provider === 'all' || provider === 'unsplash') {
      results = results.concat(await searchUnsplash(query, perPage));
    }
    return json({ success: true, query, provider, count: results.length, results });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'search failed' }, 500);
  }
};
