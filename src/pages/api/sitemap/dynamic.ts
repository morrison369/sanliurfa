import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';

export const GET: APIRoute = async () => {
  const site = import.meta.env.SITE_URL || 'https://sanliurfa.com';
  
  // Fetch all dynamic content
  const [placesResult, blogPostsResult, eventsResult, historicalSitesResult] = await Promise.all([
    query("SELECT slug, updated_at FROM places WHERE status = 'active'", []),
    query("SELECT slug, updated_at FROM blog_posts WHERE is_published = true", []),
    query("SELECT slug, updated_at FROM events WHERE status = 'published'", []),
    query("SELECT slug, updated_at FROM historical_sites WHERE status = 'active'", []),
  ]);

  const places = placesResult.rows;
  const blogPosts = blogPostsResult.rows;
  const events = eventsResult.rows;
  const historicalSites = historicalSitesResult.rows;

  const urls = [
    // Static pages
    { loc: '/', priority: 1.0, changefreq: 'daily' },
    { loc: '/places', priority: 0.9, changefreq: 'daily' },
    { loc: '/tarihi-yerler', priority: 0.9, changefreq: 'weekly' },
    { loc: '/gastronomi', priority: 0.9, changefreq: 'weekly' },
    { loc: '/etkinlikler', priority: 0.8, changefreq: 'daily' },
    { loc: '/blog', priority: 0.8, changefreq: 'daily' },
    { loc: '/hakkinda', priority: 0.5, changefreq: 'monthly' },
    { loc: '/iletisim', priority: 0.5, changefreq: 'monthly' },
    
    // Dynamic pages
    ...(places?.map(p => ({ loc: `/places/${p.slug}`, priority: 0.7, changefreq: 'weekly', lastmod: p.updated_at })) || []),
    ...(blogPosts?.map(p => ({ loc: `/blog/${p.slug}`, priority: 0.7, changefreq: 'weekly', lastmod: p.updated_at })) || []),
    ...(events?.map(e => ({ loc: `/etkinlikler/${e.slug}`, priority: 0.6, changefreq: 'daily', lastmod: e.updated_at })) || []),
    ...(historicalSites?.map(s => ({ loc: `/tarihi-yerler/${s.slug}`, priority: 0.8, changefreq: 'monthly', lastmod: s.updated_at })) || []),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${site}${url.loc}</loc>
    <priority>${url.priority}</priority>
    <changefreq>${url.changefreq}</changefreq>
    ${url.lastmod ? `<lastmod>${new Date(url.lastmod).toISOString()}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
