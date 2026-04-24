import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { getSiteBranding } from '../../../lib/site-branding';

export const GET: APIRoute = async () => {
  const { baseUrl } = await getSiteBranding();

  const safeQuery = async (sql: string) => {
    try {
      return await query(sql, []);
    } catch {
      return { rows: [] };
    }
  };

  // Fetch all dynamic content
  const [placesResult, blogPostsResult, eventsResult, historicalSitesResult] = await Promise.all([
    safeQuery("SELECT slug, updated_at FROM places WHERE status = 'active'"),
    safeQuery("SELECT slug, updated_at FROM blog_posts WHERE status = 'published'"),
    safeQuery("SELECT slug, updated_at FROM events WHERE status = 'published'"),
    safeQuery("SELECT slug, updated_at FROM historical_sites WHERE status = 'active'"),
  ]);

  const places = placesResult.rows;
  const blogPosts = blogPostsResult.rows;
  const events = eventsResult.rows;
  const historicalSites = historicalSitesResult.rows;

  const urls = [
    // Static pages
    { loc: '/', priority: 1.0, changefreq: 'daily' },
    { loc: '/mekanlar', priority: 0.9, changefreq: 'daily' },
    { loc: '/tarihi-yerler', priority: 0.9, changefreq: 'weekly' },
    { loc: '/gastronomi', priority: 0.9, changefreq: 'weekly' },
    { loc: '/etkinlikler', priority: 0.8, changefreq: 'daily' },
    { loc: '/blog', priority: 0.8, changefreq: 'daily' },
    { loc: '/hakkinda', priority: 0.5, changefreq: 'monthly' },
    { loc: '/iletisim', priority: 0.5, changefreq: 'monthly' },
    
    // Dynamic pages
    ...(places?.map(p => ({ loc: `/isletme/${p.slug}`, priority: 0.7, changefreq: 'weekly', lastmod: p.updated_at })) || []),
    ...(blogPosts?.map(p => ({ loc: `/blog/${p.slug}`, priority: 0.7, changefreq: 'weekly', lastmod: p.updated_at })) || []),
    ...(events?.map(e => ({ loc: `/etkinlikler/${e.slug}`, priority: 0.6, changefreq: 'daily', lastmod: e.updated_at })) || []),
    ...(historicalSites?.map(s => ({ loc: `/tarihi-yerler/${s.slug}`, priority: 0.8, changefreq: 'monthly', lastmod: s.updated_at })) || []),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <priority>${url.priority}</priority>
    <changefreq>${url.changefreq}</changefreq>
    ${(url as any).lastmod ? `<lastmod>${new Date((url as any).lastmod).toISOString()}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
