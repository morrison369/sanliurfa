/**
 * Blog Sitemap (XML)
 * GET /blog/sitemap.xml
 * Tüm yayınlanmış yazıları içeren dinamik sitemap
 */

import type { APIRoute } from 'astro';
import { queryMany, queryOne } from '../../lib/postgres';

export const GET: APIRoute = async () => {
  try {
    // Tüm yayınlanmış yazıları getir
    const posts = await queryMany(`
      SELECT id, slug, published_at, updated_at, view_count
      FROM blog_posts
      WHERE status = 'published'
      ORDER BY published_at DESC
    `);

    // Tüm kategorileri getir
    const categories = await queryMany(`
      SELECT slug, created_at
      FROM blog_categories
      ORDER BY created_at DESC
    `);

    // Sitemap XML oluştur
    const sitemap = generateSitemap(posts, categories);

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // 1 saat cache
      }
    });
  } catch (err) {
    console.error('Sitemap oluşturulamadı:', err);

    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });
  }
};

/**
 * Sitemap XML'i oluştur
 */
function generateSitemap(
  posts: any[],
  categories: any[]
): string {
  const baseUrl = 'https://sanliurfa.com';
  const urls: string[] = [];

  // Blog ana sayfası
  urls.push(`
    <url>
      <loc>${baseUrl}/blog</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>
  `);

  // Blog yazıları
  posts.forEach((post: any) => {
    const lastmod = post.updated_at || post.published_at;
    const priority = calculatePriority(post.view_count);

    urls.push(`
    <url>
      <loc>${baseUrl}/blog/${post.slug}</loc>
      <lastmod>${lastmod ? new Date(lastmod).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>${priority}</priority>
      <image:image>
        <image:loc>${baseUrl}/blog/${post.slug}/og-image.jpg</image:loc>
        <image:title>${post.title}</image:title>
      </image:image>
    </url>
    `);
  });

  // Kategori sayfaları
  categories.forEach((cat: any) => {
    urls.push(`
    <url>
      <loc>${baseUrl}/blog?category=${cat.slug}</loc>
      <lastmod>${new Date(cat.created_at).toISOString().split('T')[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>
    `);
  });

  // XML'i oluştur
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${urls.join('')}
</urlset>`;

  return xml.trim();
}

/**
 * Görüntüleme sayısına göre priority hesapla
 * Daha çok okunan yazılar daha yüksek priority
 */
function calculatePriority(viewCount: number): string {
  if (viewCount >= 1000) return '0.9';
  if (viewCount >= 500) return '0.8';
  if (viewCount >= 100) return '0.7';
  return '0.6';
}
