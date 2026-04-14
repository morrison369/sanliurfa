import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';

const SITE_URL = import.meta.env.SITE_URL || 'https://sanliurfa.com';

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export const GET: APIRoute = async () => {
  const entries: SitemapEntry[] = [];
  const now = new Date().toISOString();

  // Statik sayfalar
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' as const },
    { url: '/mekanlar', priority: 0.9, changefreq: 'daily' as const },
    { url: '/gezilecek-yerler', priority: 0.9, changefreq: 'weekly' as const },
    { url: '/ilceler', priority: 0.9, changefreq: 'weekly' as const },
    { url: '/yeme-icme', priority: 0.9, changefreq: 'weekly' as const },
    { url: '/blog', priority: 0.9, changefreq: 'daily' as const },
    { url: '/etkinlikler', priority: 0.8, changefreq: 'daily' as const },
    { url: '/gastronomi', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/tarihi-yerler', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/saglik/nobetci-eczaneler', priority: 0.8, changefreq: 'daily' as const },
    { url: '/saglik', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/egitim', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/ulasim', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/alisveris', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/hizmetler', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/emlak', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/konaklama', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/etkinlikler/konserler', priority: 0.7, changefreq: 'daily' as const },
    { url: '/etkinlikler/sira-geceleri', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/etkinlikler/festivaller', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/etkinlikler/bugun', priority: 0.9, changefreq: 'daily' as const },
    { url: '/etkinlikler/hafta-sonu', priority: 0.8, changefreq: 'daily' as const },
    { url: '/places', priority: 0.8, changefreq: 'daily' as const },
    { url: '/hakkinda', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/iletisim', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/gizlilik-politikasi', priority: 0.2, changefreq: 'yearly' as const },
    { url: '/kullanim-kosullari', priority: 0.2, changefreq: 'yearly' as const },
  ];

  for (const page of staticPages) {
    entries.push({ url: page.url, lastmod: now, changefreq: page.changefreq, priority: page.priority });
  }

  try {
    // Kategori sayfaları
    const categories = await query("SELECT slug FROM categories WHERE is_active = true AND parent_id IS NOT NULL");
    for (const cat of categories.rows) {
      entries.push({ url: `/mekanlar/${cat.slug}`, lastmod: now, changefreq: 'weekly', priority: 0.7 });
    }

    // İlçe sayfaları
    const districts = await query("SELECT slug FROM districts");
    for (const d of districts.rows) {
      entries.push({ url: `/ilceler/${d.slug}`, lastmod: now, changefreq: 'weekly', priority: 0.7 });
    }

    // Mekan detay sayfaları
    const places = await query("SELECT slug, updated_at FROM places WHERE status = 'active' ORDER BY rating DESC LIMIT 500");
    for (const p of places.rows) {
      entries.push({ url: `/places/${p.slug}`, lastmod: p.updated_at || now, changefreq: 'weekly', priority: 0.6 });
    }

    // Tarihi yerler
    const sites = await query("SELECT slug, updated_at FROM historical_sites WHERE status = 'active'");
    for (const s of sites.rows) {
      entries.push({ url: `/gezilecek-yerler/${s.slug}`, lastmod: s.updated_at || now, changefreq: 'monthly', priority: 0.6 });
    }

    // Blog yazıları
    const posts = await query("SELECT slug, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 100");
    for (const p of posts.rows) {
      entries.push({ url: `/blog/${p.slug}`, lastmod: p.published_at || now, changefreq: 'monthly', priority: 0.6 });
    }

    // SEO landing sayfaları
    const seoPages = await query("SELECT slug FROM seo_pages WHERE is_active = true");
    for (const sp of seoPages.rows) {
      entries.push({ url: `/${sp.slug}`, lastmod: now, changefreq: 'weekly', priority: 0.8 });
    }
  } catch (e) {
    console.error('Sitemap DB error (using static only):', e);
  }

  // XML oluştur
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url>
    <loc>${SITE_URL}${e.url}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
