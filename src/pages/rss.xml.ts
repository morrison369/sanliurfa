import type { APIRoute } from "astro";
import { getCuratedBlogPosts } from "../data/curated-blog-posts";
import { query } from "../lib/postgres";

export const GET: APIRoute = async () => {
  const site = process.env.SITE_URL || "https://sanliurfa.com";

  let posts = getCuratedBlogPosts().map((post) => ({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    published_at: post.publishedAt,
  }));

  try {
    const result = await query(
      "SELECT title, slug, excerpt, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC NULLS LAST, updated_at DESC LIMIT 20",
      [],
    );
    posts = result.rows.length > 0 ? result.rows : posts;
  } catch (error) {
    console.warn(
      "RSS blog sorgusu başarısız, curated Şanlıurfa blog yazıları kullanılıyor.",
      error,
    );
  }

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>sanliurfa.com Blog</title>
    <link>${site}</link>
    <description>Şanlıurfa hakkında en güncel yazılar, gezi rehberleri ve gastronomi önerileri.</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts
      ?.map(
        (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${site}/blog/${post.slug}</link>
      <guid isPermaLink="true">${site}/blog/${post.slug}</guid>
      <pubDate>${toRssDate(post.published_at)}</pubDate>
      <description>${escapeXml(post.excerpt || "")}</description>
    </item>
    `,
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRssDate(value: string | Date | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toUTCString()
    : date.toUTCString();
}
