import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://sanliurfa.com';
  
  const staticPages = ['', '/places', '/tarihi-yerler', '/gastronomi', '/blog', '/etkinlikler', '/hakkinda', '/iletisim'];

  const [placesResult, sitesResult, postsResult] = await Promise.all([
    query("SELECT slug, updated_at FROM places WHERE status = 'active'", []),
    query("SELECT slug, updated_at FROM historical_sites WHERE status = 'active'", []),
    query("SELECT slug, updated_at FROM blog_posts WHERE is_published = true", []),
  ]);

  const urls = [
    ...staticPages.map(page => ({
      loc: `${baseUrl}${page}`,
      lastmod: new Date().toISOString(),
      changefreq: page === '' ? 'daily' : 'weekly',
      priority: page === '' ? '1.0' : '0.8',
    })),
    ...placesResult.rows.map((place: any) => ({
      loc: `${baseUrl}/places/${place.slug}`,
      lastmod: place.updated_at,
      changefreq: 'weekly',
      priority: '0.7',
    })),
    ...sitesResult.rows.map((site: any) => ({
      loc: `${baseUrl}/tarihi-yerler/${site.slug}`,
      lastmod: site.updated_at,
      changefreq: 'monthly',
      priority: '0.8',
    })),
    ...postsResult.rows.map((post: any) => ({
      loc: `${baseUrl}/blog/${post.slug}`,
      lastmod: post.updated_at,
      changefreq: 'monthly',
      priority: '0.6',
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
