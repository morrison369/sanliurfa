import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';

export const GET: APIRoute = async () => {
  const site = import.meta.env.SITE_URL || 'https://sanliurfa.com';
  
  const result = await query(
    "SELECT title, slug, excerpt, published_at FROM blog_posts WHERE is_published = true ORDER BY published_at DESC LIMIT 20",
    []
  );
  const posts = result.rows;

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Şanlıurfa.com Blog</title>
    <link>${site}</link>
    <description>Şanlıurfa hakkında en güncel yazılar, gezi rehberleri ve gastronomi önerileri.</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts?.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${site}/blog/${post.slug}</link>
      <guid isPermaLink="true">${site}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt || '')}</description>
    </item>
    `).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
