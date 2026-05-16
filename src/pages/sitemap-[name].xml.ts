/**
 * Sitemap alt-bölüm dispatcher.
 *
 *   /sitemap-pages.xml       → pages
 *   /sitemap-categories.xml  → categories
 *   /sitemap-ilceler.xml     → ilceler (district + neighborhood + intersection)
 *   /sitemap-places.xml      → places (mekan detay)
 *   /sitemap-historical.xml  → historical_sites
 *   /sitemap-blog.xml        → blog_posts (news extension)
 *   /sitemap-events.xml      → events (180 gün)
 *   /sitemap-recipes.xml     → recipes
 *   /sitemap-guides.xml      → gezi rehberi master + 10 ilçe
 *
 * Tanınmayan `name` → 404
 */
import type { APIRoute } from 'astro';
import { queryRead as query } from '../lib/postgres';
import { getSiteBranding } from '../lib/site-branding';
import { logger } from '../lib/logging';
import { ILCE_GEZI_REHBERI } from '../data/ilce-gezi-rehberi';
import { flattenClassifiedCategories } from '../data/classified-categories';
import {
  buildUrlsetXml,
  SITEMAP_CACHE_HEADERS,
  toIsoLastmod,
  resolveImageUrl,
  withSitemapSourceFallback,
  type SitemapEntry,
  type ChangeFreq,
} from '../lib/sitemap/sitemap-helpers';

const NEWS_WINDOW_HOURS = 48;
const SITEMAP_VERBOSE = process.env.SITEMAP_VERBOSE === '1';

type SitemapName =
  | 'pages' | 'categories' | 'ilceler' | 'places' | 'historical'
  | 'blog' | 'events' | 'recipes' | 'guides';

const VALID_NAMES = new Set<SitemapName>([
  'pages', 'categories', 'ilceler', 'places', 'historical',
  'blog', 'events', 'recipes', 'guides',
]);

// ─── pages: statik tier'lar ───────────────────────────────────────────────────
function buildPagesEntries(nowIso: string): SitemapEntry[] {
  type Static = { url: string; priority: number; changefreq: ChangeFreq };

  const corPages: Static[] = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/mekanlar', priority: 0.95, changefreq: 'daily' },
    { url: '/blog', priority: 0.9, changefreq: 'daily' },
    { url: '/etkinlikler', priority: 0.9, changefreq: 'daily' },
    { url: '/ilceler', priority: 0.9, changefreq: 'weekly' },
    { url: '/gezilecek-yerler', priority: 0.9, changefreq: 'weekly' },
    { url: '/yemek-tarifleri', priority: 0.85, changefreq: 'weekly' },
    { url: '/gastronomi', priority: 0.85, changefreq: 'weekly' },
    { url: '/harita', priority: 0.8, changefreq: 'weekly' },
    { url: '/tarihi-yerler', priority: 0.8, changefreq: 'weekly' },
  ];

  const categoryHubs: Static[] = [
    { url: '/yeme-icme', priority: 0.85, changefreq: 'daily' },
    { url: '/konaklama', priority: 0.8, changefreq: 'weekly' },
    { url: '/saglik', priority: 0.8, changefreq: 'weekly' },
    { url: '/alisveris', priority: 0.75, changefreq: 'weekly' },
    { url: '/hizmetler', priority: 0.75, changefreq: 'weekly' },
    { url: '/egitim', priority: 0.7, changefreq: 'weekly' },
    { url: '/ulasim', priority: 0.75, changefreq: 'weekly' },
    { url: '/ulasim/otobus-saatleri', priority: 0.8, changefreq: 'daily' },
    { url: '/ulasim/ucak-saatleri', priority: 0.8, changefreq: 'daily' },
    { url: '/ulasim/otobus-hatlari', priority: 0.7, changefreq: 'weekly' },
    { url: '/spor-ve-fitness', priority: 0.7, changefreq: 'weekly' },
    { url: '/dini-ve-kulturel-yerler', priority: 0.75, changefreq: 'weekly' },
    { url: '/aile-ve-cocuk', priority: 0.65, changefreq: 'weekly' },
    { url: '/ev-ve-yasam', priority: 0.65, changefreq: 'weekly' },
    { url: '/hukuk-ve-finans', priority: 0.65, changefreq: 'weekly' },
    { url: '/medya-ve-iletisim', priority: 0.6, changefreq: 'weekly' },
    { url: '/otomotiv', priority: 0.6, changefreq: 'weekly' },
    { url: '/tarim-ve-hayvancilik', priority: 0.6, changefreq: 'weekly' },
    { url: '/is-dunyasi-ve-sanayi', priority: 0.6, changefreq: 'weekly' },
    { url: '/acil-durum', priority: 0.7, changefreq: 'weekly' },
    { url: '/emlak', priority: 0.7, changefreq: 'weekly' },
    { url: '/mahalleler', priority: 0.7, changefreq: 'weekly' },
  ];

  const landingPages: Static[] = [
    { url: '/en-iyi-kebapcilar', priority: 0.8, changefreq: 'weekly' },
    { url: '/en-iyi-oteller', priority: 0.8, changefreq: 'weekly' },
    { url: '/en-iyi-gezilecek-yerler', priority: 0.8, changefreq: 'weekly' },
    { url: '/en-iyi-kahvalti-mekanlari', priority: 0.8, changefreq: 'weekly' },
    { url: '/en-iyi-cigerciler', priority: 0.8, changefreq: 'weekly' },
    { url: '/sanliurfa-kahvalti-mekanlari', priority: 0.8, changefreq: 'weekly' },
    { url: '/sanliurfada-ne-yenir', priority: 0.8, changefreq: 'weekly' },
    { url: '/sanliurfa-sira-gecesi-mekanlari', priority: 0.75, changefreq: 'weekly' },
    { url: '/sanliurfa-gece-acik-mekanlar', priority: 0.7, changefreq: 'weekly' },
    { url: '/ucretsiz-gezilecek-yerler', priority: 0.7, changefreq: 'weekly' },
    { url: '/bugun-sanliurfada-ne-yapilir', priority: 0.8, changefreq: 'daily' },
    { url: '/isletme-kayit', priority: 0.7, changefreq: 'monthly' },
    { url: '/etkinlik-ekle', priority: 0.7, changefreq: 'monthly' },
    { url: '/halfeti-tekne-turu', priority: 0.75, changefreq: 'weekly' },
    { url: '/sanliurfa-fotograf-sporlari', priority: 0.7, changefreq: 'weekly' },
    { url: '/arama', priority: 0.6, changefreq: 'weekly' },
    { url: '/arama/gelismis', priority: 0.5, changefreq: 'monthly' },
    { url: '/topluluk', priority: 0.8, changefreq: 'daily' },
    { url: '/eslesme', priority: 0.7, changefreq: 'daily' },
    { url: '/trend', priority: 0.7, changefreq: 'daily' },
    { url: '/liderlik-tablosu', priority: 0.6, changefreq: 'daily' },
    { url: '/siralamalar', priority: 0.6, changefreq: 'daily' },
    { url: '/oneriler', priority: 0.7, changefreq: 'daily' },
    { url: '/saglik/eczaneler', priority: 0.7, changefreq: 'daily' },
    { url: '/saglik/nobetci-eczaneler', priority: 0.8, changefreq: 'daily' },
    { url: '/emlak/satilik-daire', priority: 0.7, changefreq: 'daily' },
    { url: '/emlak/kiralik-daire', priority: 0.7, changefreq: 'daily' },
    { url: '/ilanlar', priority: 0.75, changefreq: 'daily' },
  ];

  const institutionalPages: Static[] = [
    { url: '/hakkinda', priority: 0.5, changefreq: 'monthly' },
    { url: '/iletisim', priority: 0.4, changefreq: 'monthly' },
    { url: '/kunye', priority: 0.45, changefreq: 'monthly' },
    { url: '/yazarlar', priority: 0.5, changefreq: 'monthly' },
    { url: '/yayin-politikasi', priority: 0.5, changefreq: 'monthly' },
    { url: '/sss', priority: 0.5, changefreq: 'monthly' },
    { url: '/gizlilik-politikasi', priority: 0.2, changefreq: 'yearly' },
    { url: '/kullanim-kosullari', priority: 0.2, changefreq: 'yearly' },
    { url: '/kvkk', priority: 0.2, changefreq: 'yearly' },
    { url: '/cerez-politikasi', priority: 0.2, changefreq: 'yearly' },
    { url: '/fiyatlandirma', priority: 0.4, changefreq: 'monthly' },
  ];

  const classifiedPages: Static[] = flattenClassifiedCategories()
    .map((category) => ({
      url: `/ilanlar/kategori/${category.slug}`,
      priority: category.depth === 0 ? 0.72 : 0.68,
      changefreq: 'daily' as ChangeFreq,
    }));

  return [...corPages, ...categoryHubs, ...landingPages, ...classifiedPages, ...institutionalPages]
    .map((p) => ({ url: p.url, lastmod: nowIso, changefreq: p.changefreq, priority: p.priority }));
}

// ─── guides: gezi rehberi master + 10 ilçe ────────────────────────────────────
function buildGuidesEntries(nowIso: string): SitemapEntry[] {
  const masters: SitemapEntry[] = [
    { url: '/sanliurfa-gezi-rehberi', lastmod: nowIso, changefreq: 'weekly', priority: 0.95 },
    { url: '/gobeklitepe-gezi-rehberi', lastmod: nowIso, changefreq: 'weekly', priority: 0.9 },
    { url: '/balikligol-gezi-rehberi', lastmod: nowIso, changefreq: 'weekly', priority: 0.9 },
  ];
  const ilceleri: SitemapEntry[] = Object.keys(ILCE_GEZI_REHBERI).map((slug) => ({
    url: `/${slug}-gezi-rehberi`,
    lastmod: nowIso,
    changefreq: 'weekly' as ChangeFreq,
    priority: 0.85,
  }));
  return [...masters, ...ilceleri];
}

// ─── DB-driven sections ───────────────────────────────────────────────────────
async function buildCategoriesEntries(nowIso: string): Promise<SitemapEntry[]> {
  const res = await query(`
    SELECT DISTINCT c.slug, c.updated_at
    FROM categories c
    JOIN places p ON p.category_id = c.id AND p.status = 'active'
    WHERE c.is_active = true AND c.parent_id IS NOT NULL
    ORDER BY c.slug
  `).catch(() => ({ rows: [] }));
  return res.rows.map((cat: any) => ({
    url: `/mekanlar/${cat.slug}`,
    lastmod: toIsoLastmod(cat.updated_at, nowIso),
    changefreq: 'weekly' as ChangeFreq,
    priority: 0.7,
  }));
}

async function buildIlcelerEntries(nowIso: string): Promise<SitemapEntry[]> {
  const [districtsRes, intersectionsRes, neighborhoodsRes] = await Promise.all([
    query(`
      SELECT d.slug, MAX(p.updated_at) as last_updated
      FROM districts d
      LEFT JOIN places p ON p.district_id = d.id AND p.status = 'active'
      GROUP BY d.slug
    `).catch(() => ({ rows: [] })),
    query(`
      SELECT d.slug AS district_slug, c.slug AS category_slug,
             MAX(p.updated_at) AS last_updated,
             COUNT(p.id) AS place_count
      FROM places p
      JOIN districts d ON d.id = p.district_id
      JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active' AND c.is_active = true AND c.parent_id IS NOT NULL
      GROUP BY d.slug, c.slug
      HAVING COUNT(p.id) >= 2
      ORDER BY COUNT(p.id) DESC
      LIMIT 200
    `).catch(() => ({ rows: [] })),
    query(`
      SELECT n.slug AS mahalle_slug, d.slug AS district_slug
      FROM neighborhoods n
      JOIN districts d ON d.id = n.district_id
      ORDER BY d.name, n.name
    `).catch(() => ({ rows: [] })),
  ]);

  const entries: SitemapEntry[] = [];
  for (const d of districtsRes.rows) {
    entries.push({
      url: `/ilceler/${d.slug}`,
      lastmod: toIsoLastmod(d.last_updated, nowIso),
      changefreq: 'weekly',
      priority: 0.75,
    });
  }
  for (const dc of intersectionsRes.rows) {
    entries.push({
      url: `/ilceler/${dc.district_slug}/${dc.category_slug}`,
      lastmod: toIsoLastmod(dc.last_updated, nowIso),
      changefreq: 'weekly',
      priority: Number(dc.place_count) >= 5 ? 0.7 : 0.6,
    });
  }
  for (const n of neighborhoodsRes.rows) {
    entries.push({
      url: `/mahalleler/${n.district_slug}/${n.mahalle_slug}`,
      lastmod: nowIso,
      changefreq: 'monthly',
      priority: 0.5,
    });
  }
  return entries;
}

async function buildPlacesEntries(nowIso: string, baseUrl: string): Promise<SitemapEntry[]> {
  const res = await query(`
    SELECT p.slug, p.updated_at, p.rating, p.review_count, p.image_url, p.name, p.short_description
    FROM places p
    WHERE p.status = 'active'
    ORDER BY p.rating DESC NULLS LAST, p.review_count DESC NULLS LAST
  `).catch(() => ({ rows: [] }));
  return res.rows.map((p: any) => {
    const rating = Number(p.rating) || 0;
    const reviews = Number(p.review_count) || 0;
    const hasImage = !!(p.image_url && p.image_url.trim());
    const priority = hasImage
      ? rating >= 4.5 || reviews >= 10 ? 0.8
      : rating >= 4.0 ? 0.75
      : 0.7
      : 0.6;
    return {
      url: `/isletme/${p.slug}`,
      lastmod: toIsoLastmod(p.updated_at, nowIso),
      changefreq: 'weekly' as ChangeFreq,
      priority,
      imageUrl: resolveImageUrl(p.image_url, baseUrl),
      imageTitle: p.name,
      imageCaption: p.short_description ?? undefined,
    };
  });
}

async function buildHistoricalEntries(nowIso: string, baseUrl: string): Promise<SitemapEntry[]> {
  const res = await query(`
    SELECT slug, updated_at, name, cover_image, short_description
    FROM historical_sites WHERE status = 'published'
  `).catch(() => ({ rows: [] }));
  return res.rows.map((s: any) => ({
    url: `/tarihi-yerler/${s.slug}`,
    lastmod: toIsoLastmod(s.updated_at, nowIso),
    changefreq: 'monthly' as ChangeFreq,
    priority: 0.75,
    imageUrl: resolveImageUrl(s.cover_image, baseUrl),
    imageTitle: s.name,
    imageCaption: s.short_description ?? undefined,
  }));
}

async function buildBlogEntries(nowIso: string, baseUrl: string, siteName: string): Promise<SitemapEntry[]> {
  const [postsRes, newsRes] = await Promise.all([
    query(`
      SELECT slug, published_at, updated_at, title, featured_image, excerpt
      FROM blog_posts
      WHERE status = 'published' AND published_at <= NOW()
      ORDER BY published_at DESC
    `).catch(() => ({ rows: [] })),
    query(`
      SELECT slug, published_at, title
      FROM blog_posts
      WHERE status = 'published'
        AND published_at >= NOW() - INTERVAL '${NEWS_WINDOW_HOURS} hours'
        AND published_at <= NOW()
      ORDER BY published_at DESC
      LIMIT 1000
    `).catch(() => ({ rows: [] })),
  ]);
  const newsSet = new Set(newsRes.rows.map((r: any) => r.slug));

  return postsRes.rows.map((p: any) => {
    const hasImage = !!(p.featured_image && p.featured_image.trim());
    const isNews = newsSet.has(p.slug);
    return {
      url: `/blog/${p.slug}`,
      lastmod: toIsoLastmod(p.updated_at ?? p.published_at, nowIso),
      changefreq: (isNews ? 'daily' : 'monthly') as ChangeFreq,
      priority: isNews ? 0.85 : hasImage ? 0.7 : 0.6,
      imageUrl: resolveImageUrl(p.featured_image, baseUrl),
      imageTitle: p.title,
      imageCaption: p.excerpt ?? undefined,
      ...(isNews && p.published_at ? {
        newsPublication: { name: siteName, language: 'tr' as const },
        newsPublicationDate: toIsoLastmod(p.published_at, nowIso),
        newsTitle: p.title,
      } : {}),
    };
  });
}

async function buildEventsEntries(nowIso: string): Promise<SitemapEntry[]> {
  const res = await query(`
    SELECT slug, start_date, updated_at,
      CASE WHEN start_date <= NOW() + INTERVAL '14 days' THEN 'imminent'
           WHEN start_date <= NOW() + INTERVAL '60 days' THEN 'soon'
           ELSE 'later' END as proximity
    FROM events
    WHERE status = 'published'
      AND start_date >= NOW()
      AND start_date <= NOW() + INTERVAL '180 days'
    ORDER BY start_date ASC
  `).catch(() => ({ rows: [] }));
  return res.rows.map((e: any) => {
    const priority = e.proximity === 'imminent' ? 0.9 : e.proximity === 'soon' ? 0.8 : 0.7;
    const changefreq = (e.proximity === 'imminent' ? 'daily' : e.proximity === 'soon' ? 'weekly' : 'monthly') as ChangeFreq;
    return {
      url: `/etkinlikler/${e.slug}`,
      lastmod: toIsoLastmod(e.updated_at, nowIso),
      changefreq,
      priority,
    };
  });
}

async function buildRecipesEntries(nowIso: string, baseUrl: string): Promise<SitemapEntry[]> {
  const res = await query(`
    SELECT slug, updated_at, is_featured, name, cover_image
    FROM recipes
    WHERE status = 'published'
    ORDER BY is_featured DESC, rating DESC NULLS LAST
  `).catch(() => ({ rows: [] }));
  return res.rows.map((r: any) => ({
    url: `/yemek-tarifleri/${r.slug}`,
    lastmod: toIsoLastmod(r.updated_at, nowIso),
    changefreq: 'monthly' as ChangeFreq,
    priority: r.is_featured ? 0.75 : 0.65,
    imageUrl: resolveImageUrl(r.cover_image, baseUrl),
    imageTitle: r.name,
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const name = params.name as SitemapName | undefined;
  if (!name || !VALID_NAMES.has(name)) {
    return new Response('Not found', { status: 404 });
  }

  const start = Date.now();
  const { baseUrl, siteName } = await withSitemapSourceFallback(
    () => getSiteBranding(),
    { siteName: 'Sanliurfa.com', baseUrl: 'https://sanliurfa.com' },
    { label: `sitemap:${name}:branding`, timeoutMs: 600 },
  );
  const nowIso = new Date().toISOString();
  const safeSiteName = siteName ?? 'Sanliurfa.com';

  let entries: SitemapEntry[] = [];
  let withNewsNs = false;

  try {
    switch (name) {
      case 'pages':       entries = buildPagesEntries(nowIso); break;
      case 'guides':      entries = buildGuidesEntries(nowIso); break;
      case 'categories':
        entries = await withSitemapSourceFallback(
          () => buildCategoriesEntries(nowIso),
          [],
          { label: 'sitemap:categories:entries' },
        );
        break;
      case 'ilceler':
        entries = await withSitemapSourceFallback(
          () => buildIlcelerEntries(nowIso),
          [],
          { label: 'sitemap:ilceler:entries' },
        );
        break;
      case 'places':
        entries = await withSitemapSourceFallback(
          () => buildPlacesEntries(nowIso, baseUrl),
          [],
          { label: 'sitemap:places:entries' },
        );
        break;
      case 'historical':
        entries = await withSitemapSourceFallback(
          () => buildHistoricalEntries(nowIso, baseUrl),
          [],
          { label: 'sitemap:historical:entries' },
        );
        break;
      case 'blog':
        entries = await withSitemapSourceFallback(
          () => buildBlogEntries(nowIso, baseUrl, safeSiteName),
          [],
          { label: 'sitemap:blog:entries' },
        );
        withNewsNs = true;
        break;
      case 'events':
        entries = await withSitemapSourceFallback(
          () => buildEventsEntries(nowIso),
          [],
          { label: 'sitemap:events:entries' },
        );
        break;
      case 'recipes':
        entries = await withSitemapSourceFallback(
          () => buildRecipesEntries(nowIso, baseUrl),
          [],
          { label: 'sitemap:recipes:entries' },
        );
        break;
    }
  } catch (err) {
    logger.error(`Sitemap ${name} build error`, err instanceof Error ? err : new Error(String(err)));
  }

  const xml = buildUrlsetXml(entries, baseUrl, { news: withNewsNs });
  const ms = Date.now() - start;
  if (SITEMAP_VERBOSE) {
    logger.info('Sitemap section served', { section: name, urls: entries.length, ms });
  }

  return new Response(xml, {
    headers: {
      ...SITEMAP_CACHE_HEADERS,
      'X-Sitemap-Stats': `section=${name};urls=${entries.length};gen_ms=${ms}`,
    },
  });
};
