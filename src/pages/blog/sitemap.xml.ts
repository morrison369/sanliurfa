/**
 * Blog Sitemap (XML)
 * GET /blog/sitemap.xml
 * Tüm yayınlanmış yazıları içeren dinamik sitemap
 */

import type { APIRoute } from "astro";
import {
  curatedBlogCategories,
  getCuratedBlogPosts,
} from "../../data/curated-blog-posts";
import { queryMany } from "../../lib/postgres";

export const GET: APIRoute = async () => {
  let posts: any[] = [];
  let categories: any[] = [];

  try {
    // Tüm yayınlanmış yazıları getir
    posts = await queryMany(`
      SELECT id, title, slug, featured_image, thumbnail, published_at, updated_at, view_count
      FROM blog_posts
      WHERE status = 'published'
      ORDER BY published_at DESC
    `);
  } catch (err) {
    console.warn(
      "Blog yazıları sitemap için DB'den okunamadı, curated fallback kullanılacak:",
      err,
    );
  }

  try {
    // Tüm kategorileri getir
    categories = await queryMany(`
      SELECT slug, created_at
      FROM blog_categories
      ORDER BY created_at DESC
    `);
  } catch (err) {
    console.warn(
      "Blog kategorileri sitemap için DB'den okunamadı, curated fallback kullanılacak:",
      err,
    );
  }

  const sitemap = generateSitemap(
    mergeRowsBySlug(posts, getCuratedBlogPosts()),
    mergeRowsBySlug(categories, curatedBlogCategories),
  );

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // 1 saat cache
    },
  });
};

/**
 * Sitemap XML'i oluştur
 */
function generateSitemap(posts: any[], categories: any[]): string {
  const baseUrl = "https://sanliurfa.com";
  const urls: string[] = [];

  // Blog ana sayfası
  urls.push(`
    <url>
      <loc>${baseUrl}/blog</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>
  `);

  // Blog yazıları
  posts.forEach((post: any) => {
    const lastmod = post.updated_at || post.published_at || post.updatedAt;
    const priority = calculatePriority(post.view_count || post.viewCount || 0);
    const imageUrl = normalizeImageUrl(
      post.featured_image ||
        post.thumbnail ||
        post.cover_image ||
        post.featuredImage,
      baseUrl,
    );

    urls.push(`
    <url>
      <loc>${escapeXml(`${baseUrl}/blog/${post.slug}`)}</loc>
      <lastmod>${lastmod ? new Date(lastmod).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>${priority}</priority>
      ${
        imageUrl
          ? `
      <image:image>
        <image:loc>${escapeXml(imageUrl)}</image:loc>
        <image:title>${escapeXml(post.title || "Şanlıurfa blog yazısı")}</image:title>
      </image:image>`
          : ""
      }
    </url>
    `);
  });

  // Kategori sayfaları
  categories.forEach((cat: any) => {
    const createdAt = cat.created_at || new Date();
    urls.push(`
    <url>
      <loc>${escapeXml(`${baseUrl}/blog?category=${cat.slug}`)}</loc>
      <lastmod>${new Date(createdAt).toISOString().split("T")[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>
    `);
  });

  // XML'i oluştur
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${urls.join("")}
</urlset>`;

  return xml.trim();
}

/**
 * Görüntüleme sayısına göre priority hesapla
 * Daha çok okunan yazılar daha yüksek priority
 */
function calculatePriority(viewCount: number): string {
  if (viewCount >= 1000) return "0.9";
  if (viewCount >= 500) return "0.8";
  if (viewCount >= 100) return "0.7";
  return "0.6";
}

function normalizeImageUrl(
  imageUrl: string | null | undefined,
  baseUrl: string,
): string | null {
  if (!imageUrl) return null;

  try {
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return null;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mergeRowsBySlug(primaryRows: any[], fallbackRows: any[]): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];

  for (const row of [...primaryRows, ...fallbackRows]) {
    const key = String(row.slug || row.id || JSON.stringify(row));
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(row);
  }

  return merged;
}
