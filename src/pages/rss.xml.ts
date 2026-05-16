import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';
import { getSiteBranding } from '../lib/site-branding';
import { PUBLISHER_PROFILE } from '../lib/transparency';

export const GET: APIRoute = async () => {
  const { baseUrl, siteName } = await getSiteBranding();
  
  const result = await query(
    "SELECT title, slug, excerpt, published_at, updated_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 50",
    []
  );
  const posts = result.rows;
  const latestDate = posts?.[0]?.updated_at || posts?.[0]?.published_at || new Date().toISOString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName} Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Şanlıurfa hakkında en güncel yazılar, gezi rehberleri ve gastronomi önerileri.</description>
    <language>tr</language>
    <lastBuildDate>${new Date(latestDate).toUTCString()}</lastBuildDate>
    <pubDate>${new Date(latestDate).toUTCString()}</pubDate>
    <copyright>© ${new Date().getFullYear()} ${escapeXml(PUBLISHER_PROFILE.siteName)}</copyright>
    <managingEditor>${escapeXml(PUBLISHER_PROFILE.generalEmail)} (${escapeXml(PUBLISHER_PROFILE.publisherName)})</managingEditor>
    <webMaster>${escapeXml(PUBLISHER_PROFILE.generalEmail)} (${escapeXml(PUBLISHER_PROFILE.publisherName)})</webMaster>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>${escapeXml(siteName)} Blog</title>
      <link>${baseUrl}/blog</link>
    </image>
    ${posts?.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt || '')}</description>
      <author>${escapeXml(PUBLISHER_PROFILE.generalEmail)} (${escapeXml(PUBLISHER_PROFILE.publisherName)})</author>
      <category>Şanlıurfa</category>
      <category>Yerel Rehber</category>
    </item>
    `).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
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
