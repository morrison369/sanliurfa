import type { APIRoute } from 'astro';
import { getPublicAppUrl } from '../lib/public-app-url';
import {
  buildUrlsetXml,
  SITEMAP_CACHE_HEADERS,
  type ChangeFreq,
  type SitemapEntry,
} from '../lib/sitemap/sitemap-helpers';

const CORE_DYNAMIC_URLS: Array<{ url: string; priority: number; changefreq: ChangeFreq }> = [
  { url: '/', priority: 1, changefreq: 'daily' },
  { url: '/mekanlar', priority: 0.95, changefreq: 'daily' },
  { url: '/ilceler', priority: 0.9, changefreq: 'weekly' },
  { url: '/yemek-tarifleri', priority: 0.85, changefreq: 'weekly' },
  { url: '/saglik/nobetci-eczaneler', priority: 0.8, changefreq: 'daily' },
  { url: '/ulasim/otobus-saatleri', priority: 0.8, changefreq: 'daily' },
  { url: '/ulasim/ucak-saatleri', priority: 0.8, changefreq: 'daily' },
  { url: '/etkinlikler', priority: 0.9, changefreq: 'daily' },
  { url: '/topluluk', priority: 0.8, changefreq: 'daily' },
  { url: '/eslesme', priority: 0.7, changefreq: 'daily' },
  { url: '/isletme-kayit', priority: 0.7, changefreq: 'monthly' },
];

export const GET: APIRoute = async () => {
  const nowIso = new Date().toISOString();
  const baseUrl = getPublicAppUrl();
  const entries: SitemapEntry[] = CORE_DYNAMIC_URLS.map((item) => ({
    url: item.url,
    lastmod: nowIso,
    changefreq: item.changefreq,
    priority: item.priority,
  }));

  return new Response(buildUrlsetXml(entries, baseUrl), { headers: SITEMAP_CACHE_HEADERS });
};
