import type { APIRoute } from "astro";
import rss, { type RSSFeedItem } from "@astrojs/rss";
import { getCuratedBlogPosts } from "../data/curated-blog-posts";

export const GET: APIRoute = async (context) => {
  let posts = getCuratedBlogPosts().map((post) => ({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    published_at: post.publishedAt,
  }));

  try {
    const { query } = await import("../lib/postgres");
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

  const items: RSSFeedItem[] = posts.map((post) => ({
    title: post.title,
    link: `/blog/${post.slug}`,
    pubDate: toRssDate(post.published_at),
    description: post.excerpt || "Şanlıurfa blog yazısı",
  }));

  return rss({
    title: "sanliurfa.com Blog",
    description:
      "Şanlıurfa hakkında en güncel yazılar, gezi rehberleri ve gastronomi önerileri.",
    site: context.site || new URL("https://sanliurfa.com"),
    items,
    customData: `<language>tr-TR</language>`,
  });
};

function toRssDate(value: string | Date | null | undefined): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
