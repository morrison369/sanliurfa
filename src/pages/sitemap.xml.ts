/**
 * SitemapIndex — /sitemap.xml
 *
 * WordPress (Yoast/RankMath) tarzı bölümlü sitemap mimarisi:
 *   /sitemap.xml             → Bu dosya (sitemapindex — alt sitemap referansları)
 *   /sitemap-dynamic.xml     → Kritik dinamik şehir/servis URL'leri
 *   /sitemap-pages.xml       → Anasayfa + hub'lar + landing + kurumsal
 *   /sitemap-categories.xml  → Kategoriler (mekanlar/{kategori})
 *   /sitemap-places.xml      → Mekan detayları (place image extension)
 *   /sitemap-blog.xml        → Blog yazıları + Google News (son 48 saat)
 *   /sitemap-events.xml      → Yaklaşan etkinlikler (180 gün)
 *   /sitemap-recipes.xml     → Yemek tarifleri (image extension)
 *   /sitemap-historical.xml  → Tarihi yerler (image extension)
 *   /sitemap-guides.xml      → Gezi rehberleri (master + 10 ilçe)
 *   /sitemap-ilceler.xml     → İlçe sayfaları + mahalleler + ilçe×kategori
 *
 * Her alt sitemap kendi lastmod'unu döner.
 *
 * SEO/GEO kritik URL sinyalleri:
 * /, /mekanlar, /ilceler, /yemek-tarifleri, /saglik/nobetci-eczaneler,
 * /ulasim/otobus-saatleri, /ulasim/ucak-saatleri, /etkinlikler,
 * /topluluk, /eslesme, /isletme-kayit
 */
import type { APIRoute } from 'astro';
import { queryRead as query } from '../lib/postgres';
import { getSiteBranding } from '../lib/site-branding';
import { logger } from '../lib/logging';
import {
  buildSitemapIndexXml,
  SITEMAP_CACHE_HEADERS,
  type IndexedSitemap,
  withSitemapSourceFallback,
} from '../lib/sitemap/sitemap-helpers';

const SITEMAP_VERBOSE = process.env.SITEMAP_VERBOSE === '1';

export const GET: APIRoute = async () => {
  const { baseUrl } = await withSitemapSourceFallback(
    () => getSiteBranding(),
    { siteName: 'Sanliurfa.com', baseUrl: 'https://sanliurfa.com' },
    { label: 'sitemap:index:branding', timeoutMs: 600 },
  );
  const nowIso = new Date().toISOString();

  // Her alt sitemap için en güncel lastmod'u DB'den çek (paralel).
  const [placesLast, blogLast, eventsLast, recipesLast, sitesLast, categoriesLast] =
    await withSitemapSourceFallback(
      () => Promise.all([
        query<{ updated: string | null }>(`SELECT MAX(updated_at)::text AS updated FROM places WHERE status = 'active'`)
          .then((r) => r.rows[0]?.updated ?? null)
          .catch(() => null),
        query<{ updated: string | null }>(`SELECT MAX(GREATEST(updated_at, published_at))::text AS updated FROM blog_posts WHERE status = 'published'`)
          .then((r) => r.rows[0]?.updated ?? null)
          .catch(() => null),
        query<{ updated: string | null }>(`SELECT MAX(updated_at)::text AS updated FROM events WHERE status = 'published'`)
          .then((r) => r.rows[0]?.updated ?? null)
          .catch(() => null),
        query<{ updated: string | null }>(`SELECT MAX(updated_at)::text AS updated FROM recipes WHERE status = 'published'`)
          .then((r) => r.rows[0]?.updated ?? null)
          .catch(() => null),
        query<{ updated: string | null }>(`SELECT MAX(updated_at)::text AS updated FROM historical_sites WHERE status = 'published'`)
          .then((r) => r.rows[0]?.updated ?? null)
          .catch(() => null),
        query<{ updated: string | null }>(`SELECT MAX(updated_at)::text AS updated FROM categories WHERE is_active = true`)
          .then((r) => r.rows[0]?.updated ?? null)
          .catch(() => null),
      ]),
      [null, null, null, null, null, null] as const,
      { label: 'sitemap:index:lastmod-batch' },
    );

  function asIso(value: string | null): string {
    if (!value) return nowIso;
    try {
      return new Date(value).toISOString();
    } catch {
      return nowIso;
    }
  }

  const sitemaps: IndexedSitemap[] = [
    { path: '/sitemap-dynamic.xml',     lastmod: nowIso },
    { path: '/sitemap-pages.xml',       lastmod: nowIso },
    { path: '/sitemap-categories.xml',  lastmod: asIso(categoriesLast) },
    { path: '/sitemap-ilceler.xml',     lastmod: asIso(placesLast) },
    { path: '/sitemap-places.xml',      lastmod: asIso(placesLast) },
    { path: '/sitemap-historical.xml',  lastmod: asIso(sitesLast) },
    { path: '/sitemap-blog.xml',        lastmod: asIso(blogLast) },
    { path: '/sitemap-events.xml',      lastmod: asIso(eventsLast) },
    { path: '/sitemap-recipes.xml',     lastmod: asIso(recipesLast) },
    { path: '/sitemap-guides.xml',      lastmod: nowIso },
  ];

  const xml = buildSitemapIndexXml(sitemaps, baseUrl);
  if (SITEMAP_VERBOSE) {
    logger.info('SitemapIndex served', { count: sitemaps.length });
  }

  return new Response(xml, { headers: SITEMAP_CACHE_HEADERS });
};
