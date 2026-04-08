/**
 * Sitemap Generation
 * Dynamic XML sitemap for SEO crawlability
 */

import { queryMany, queryOne } from './postgres';
import { logger } from './logging';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const BASE_URL = process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';

export async function generateSitemap(): Promise<string> {
  try {
    const entries: SitemapEntry[] = [];

    // Static pages
    const staticPages = [
      { loc: '/', changefreq: 'daily' as const, priority: 1.0 },
      { loc: '/mekanlar', changefreq: 'daily' as const, priority: 0.9 },
      { loc: '/etkinlikler', changefreq: 'weekly' as const, priority: 0.8 },
      { loc: '/blog', changefreq: 'weekly' as const, priority: 0.8 },
      { loc: '/hakkimizda', changefreq: 'monthly' as const, priority: 0.7 },
      { loc: '/iletisim', changefreq: 'monthly' as const, priority: 0.7 },
    ];

    entries.push(...staticPages);

    // Dynamic places
    const places = await queryMany(
      `SELECT id, slug, updated_at FROM places ORDER BY updated_at DESC LIMIT 5000`
    );

    for (const place of places) {
      entries.push({
        loc: `/mekanlar/${place.slug || place.id}`,
        lastmod: place.updated_at ? new Date(place.updated_at).toISOString().split('T')[0] : undefined,
        changefreq: 'weekly' as const,
        priority: 0.8
      });
    }

    // Dynamic categories
    const categories = await queryMany(
      `SELECT DISTINCT category FROM places WHERE category IS NOT NULL LIMIT 100`
    );

    for (const cat of categories) {
      entries.push({
        loc: `/mekanlar?kategori=${encodeURIComponent(cat.category)}`,
        changefreq: 'weekly' as const,
        priority: 0.7
      });
    }

    // Events
    const events = await queryMany(
      `SELECT id, slug, date FROM events WHERE date > NOW() ORDER BY date DESC LIMIT 1000`
    );

    for (const event of events) {
      entries.push({
        loc: `/etkinlikler/${event.slug || event.id}`,
        lastmod: new Date(event.date).toISOString().split('T')[0],
        changefreq: 'weekly' as const,
        priority: 0.7
      });
    }

    // Blog posts
    const posts = await queryMany(
      `SELECT id, slug, updated_at FROM blog_posts WHERE status = 'published' ORDER BY updated_at DESC LIMIT 1000`
    );

    for (const post of posts) {
      entries.push({
        loc: `/blog/${post.slug || post.id}`,
        lastmod: post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : undefined,
        changefreq: 'weekly' as const,
        priority: 0.8
      });
    }

    // Generate XML
    const xml = buildSitemapXml(entries);
    logger.info('Sitemap generated', { entries: entries.length });
    return xml;
  } catch (error) {
    logger.error(
      'Failed to generate sitemap',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const entry of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(`${BASE_URL}${entry.loc}`)}</loc>\n`;
    if (entry.lastmod) {
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    }
    if (entry.priority !== undefined) {
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generateSitemapIndex(): Promise<string> {
  // For large sitemaps, generate index pointing to multiple sitemaps
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += `  <sitemap>\n`;
  xml += `    <loc>${BASE_URL}/sitemap.xml</loc>\n`;
  xml += `  </sitemap>\n`;
  xml += '</sitemapindex>';
  return xml;
}
