import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';
import { getSiteBranding } from '../lib/site-branding';
import { logger } from '../lib/logging';

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

// High-frequency surfaces that change often and need a separate dynamic sitemap index
const dynamicRoots: Array<{ url: string; priority: number; changefreq: SitemapEntry['changefreq'] }> = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/mekanlar', priority: 0.9, changefreq: 'daily' },
  { url: '/ilceler', priority: 0.9, changefreq: 'weekly' },
  { url: '/yemek-tarifleri', priority: 0.8, changefreq: 'weekly' },
  { url: '/saglik/nobetci-eczaneler', priority: 0.8, changefreq: 'daily' },
  { url: '/ulasim/otobus-saatleri', priority: 0.8, changefreq: 'daily' },
  { url: '/ulasim/ucak-saatleri', priority: 0.8, changefreq: 'daily' },
  { url: '/etkinlikler', priority: 0.8, changefreq: 'daily' },
  { url: '/topluluk', priority: 0.8, changefreq: 'daily' },
  { url: '/eslesme', priority: 0.7, changefreq: 'daily' },
  { url: '/isletme-kayit', priority: 0.8, changefreq: 'weekly' },
  { url: '/bugun-sanliurfada-ne-yapilir', priority: 0.8, changefreq: 'daily' },
  { url: '/trend', priority: 0.7, changefreq: 'daily' },
  { url: '/liderlik-tablosu', priority: 0.6, changefreq: 'daily' },
  { url: '/siralamalar', priority: 0.6, changefreq: 'daily' },
  { url: '/oneriler', priority: 0.7, changefreq: 'daily' },
  { url: '/saglik/eczaneler', priority: 0.7, changefreq: 'daily' },
  { url: '/emlak/satilik-daire', priority: 0.7, changefreq: 'daily' },
  { url: '/emlak/kiralik-daire', priority: 0.7, changefreq: 'daily' },
];

export const GET: APIRoute = async () => {
  const { baseUrl } = await getSiteBranding();
  const now = new Date().toISOString();
  const entries: SitemapEntry[] = [];

  for (const root of dynamicRoots) {
    entries.push({ url: root.url, lastmod: now, changefreq: root.changefreq, priority: root.priority });
  }

  try {
    // Recently updated places (top 200 by update time)
    const recentPlaces = await query(
      `SELECT slug, updated_at FROM places
       WHERE status = 'active'
       ORDER BY updated_at DESC NULLS LAST
       LIMIT 200`,
    );
    for (const p of recentPlaces.rows) {
      entries.push({
        url: `/isletme/${p.slug}`,
        lastmod: p.updated_at || now,
        changefreq: 'daily',
        priority: 0.75,
      });
    }

    // Active and upcoming events
    const activeEvents = await query(
      `SELECT slug, updated_at FROM events
       WHERE status = 'published' AND start_date >= NOW() - INTERVAL '7 days'
       ORDER BY start_date ASC
       LIMIT 100`,
    );
    for (const e of activeEvents.rows) {
      entries.push({
        url: `/etkinlikler/${e.slug}`,
        lastmod: e.updated_at || now,
        changefreq: 'daily',
        priority: 0.85,
      });
    }

    // Recently published blog posts
    const recentPosts = await query(
      `SELECT slug, published_at FROM blog_posts
       WHERE status = 'published'
       ORDER BY published_at DESC NULLS LAST
       LIMIT 50`,
    );
    for (const p of recentPosts.rows) {
      entries.push({
        url: `/blog/${p.slug}`,
        lastmod: p.published_at || now,
        changefreq: 'weekly',
        priority: 0.65,
      });
    }

    // Recently published recipes
    const recentRecipes = await query(
      `SELECT slug, updated_at FROM recipes
       WHERE status = 'published'
       ORDER BY updated_at DESC NULLS LAST
       LIMIT 50`,
    );
    for (const r of recentRecipes.rows) {
      entries.push({
        url: `/yemek-tarifleri/${r.slug}`,
        lastmod: r.updated_at || now,
        changefreq: 'weekly',
        priority: 0.7,
      });
    }
  } catch (e) {
    logger.error('sitemap-dynamic DB error (using static only)', e instanceof Error ? e : new Error(String(e)));
  }

  const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueEntries.map(e => `  <url>
    <loc>${baseUrl}${e.url}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=900',
    },
  });
};
