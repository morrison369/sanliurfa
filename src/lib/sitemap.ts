/**
 * Sitemap Generation
 * Dynamic XML sitemap for SEO crawlability
 */

import { queryMany } from "./postgres";
import { logger } from "./logging";
import { getCuratedBlogPosts } from "../data/curated-blog-posts";
import { getCuratedEvents } from "../data/curated-events";
import { getCuratedFoods } from "../data/curated-foods";
import { getCuratedHistoricalSites } from "../data/curated-historical-sites";
import { getCuratedPlaces } from "../data/curated-places";
import { blogCategories, placeCategories } from "../data/categories";

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  images?: Array<{
    loc: string;
    title?: string;
  }>;
}

const BASE_URL = (
  process.env.PUBLIC_SITE_URL || "https://sanliurfa.com"
).replace(/\/$/, "");

export async function generateSitemap(): Promise<string> {
  try {
    const entries: SitemapEntry[] = [];

    // Static pages
    const staticPages = [
      { loc: "/", changefreq: "daily" as const, priority: 1.0 },
      { loc: "/places", changefreq: "daily" as const, priority: 0.9 },
      { loc: "/arama", changefreq: "weekly" as const, priority: 0.8 },
      { loc: "/kullanicilar", changefreq: "weekly" as const, priority: 0.6 },
      {
        loc: "/kullanici/sadakat",
        changefreq: "weekly" as const,
        priority: 0.6,
      },
      { loc: "/tarihi-yerler", changefreq: "weekly" as const, priority: 0.8 },
      { loc: "/gastronomi", changefreq: "weekly" as const, priority: 0.8 },
      {
        loc: "/sehir-servisleri",
        changefreq: "weekly" as const,
        priority: 0.8,
      },
      {
        loc: "/sehir-servisleri/nobetci-eczaneler",
        changefreq: "daily" as const,
        priority: 0.8,
      },
      {
        loc: "/sehir-servisleri/otobus-saatleri",
        changefreq: "weekly" as const,
        priority: 0.7,
      },
      {
        loc: "/sehir-servisleri/ucak-saatleri",
        changefreq: "weekly" as const,
        priority: 0.7,
      },
      { loc: "/etkinlikler", changefreq: "weekly" as const, priority: 0.8 },
      { loc: "/blog", changefreq: "weekly" as const, priority: 0.8 },
      { loc: "/hakkinda", changefreq: "monthly" as const, priority: 0.7 },
      { loc: "/iletisim", changefreq: "monthly" as const, priority: 0.7 },
      { loc: "/sss", changefreq: "monthly" as const, priority: 0.6 },
      {
        loc: "/gizlilik-politikasi",
        changefreq: "monthly" as const,
        priority: 0.5,
      },
      {
        loc: "/kullanim-kosullari",
        changefreq: "monthly" as const,
        priority: 0.5,
      },
      {
        loc: "/cerez-politikasi",
        changefreq: "monthly" as const,
        priority: 0.5,
      },
      { loc: "/kvkk", changefreq: "monthly" as const, priority: 0.5 },
    ];

    entries.push(...staticPages);

    // Dynamic places
    const places = await safeQueryMany(
      `SELECT id, slug, name, images, image_url, updated_at FROM places WHERE status = 'active' ORDER BY updated_at DESC LIMIT 5000`,
      "places sitemap",
    );

    const placeRows = mergeRowsBySlug(places, getCuratedPlaces());

    for (const place of placeRows) {
      entries.push({
        loc: `/places/${place.slug || place.id}`,
        lastmod: place.updated_at
          ? new Date(place.updated_at).toISOString().split("T")[0]
          : undefined,
        changefreq: "weekly" as const,
        priority: 0.8,
        images: buildImageEntries(getRowImages(place), place.name),
      });
    }

    // Dynamic categories
    const categories = await safeQueryMany(
      `SELECT DISTINCT category FROM places WHERE category IS NOT NULL LIMIT 100`,
      "place categories sitemap",
    );

    const categoryRows =
      categories.length > 0
        ? categories
        : placeCategories.map((category) => ({ category: category.id }));

    for (const cat of categoryRows) {
      entries.push({
        loc: `/places?category=${encodeURIComponent(cat.category)}`,
        changefreq: "weekly" as const,
        priority: 0.7,
      });
    }

    // Events
    const events = await safeQueryMany(
      `SELECT id, slug, title, image_url, start_date FROM events WHERE status IN ('published', 'active') ORDER BY start_date DESC LIMIT 1000`,
      "events sitemap",
    );

    const eventRows = mergeRowsBySlug(events, getCuratedEvents());

    for (const event of eventRows) {
      const eventDate = event.start_date;
      entries.push({
        loc: `/etkinlikler/${event.slug || event.id}`,
        lastmod: eventDate
          ? new Date(eventDate).toISOString().split("T")[0]
          : undefined,
        changefreq: "weekly" as const,
        priority: 0.7,
        images: buildImageEntries(getRowImages(event), event.title),
      });
    }

    // Historical sites
    const historicalSites = await safeQueryMany(
      `SELECT id, slug, name, images, updated_at FROM historical_sites WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1000`,
      "historical sites sitemap",
    );

    const historicalRows = mergeRowsBySlug(
      historicalSites,
      getCuratedHistoricalSites(),
    );

    for (const site of historicalRows) {
      entries.push({
        loc: `/tarihi-yerler/${site.slug || site.id}`,
        lastmod: site.updated_at
          ? new Date(site.updated_at).toISOString().split("T")[0]
          : undefined,
        changefreq: "monthly" as const,
        priority: 0.8,
        images: buildImageEntries(getRowImages(site), site.name),
      });
    }

    // Şanlıurfa food content
    const foodRows = getCuratedFoods();

    for (const food of foodRows) {
      entries.push({
        loc: `/gastronomi/${food.slug || food.id}`,
        lastmod: toSitemapDate((food as any).updated_at),
        changefreq: "monthly" as const,
        priority: 0.8,
        images: buildImageEntries(getRowImages(food), food.name),
      });
    }

    // Blog posts
    const posts = await safeQueryMany(
      `SELECT id, slug, title, cover_image, featured_image, thumbnail, updated_at, published_at FROM blog_posts WHERE status = 'published' ORDER BY updated_at DESC LIMIT 1000`,
      "blog posts sitemap",
    );

    const postRows = mergeRowsBySlug(posts, getCuratedBlogPosts());

    for (const post of postRows) {
      entries.push({
        loc: `/blog/${post.slug || post.id}`,
        lastmod: toSitemapDate(
          post.updated_at || post.published_at || post.updatedAt,
        ),
        changefreq: "weekly" as const,
        priority: 0.8,
        images: buildImageEntries(getRowImages(post), post.title),
      });
    }

    for (const category of blogCategories) {
      entries.push({
        loc: `/blog?category=${encodeURIComponent(category.slug)}`,
        changefreq: "weekly",
        priority: 0.7,
      });
    }

    // Generate XML
    const xml = buildSitemapXml(dedupeEntries(entries));
    logger.info("Sitemap generated", { entries: entries.length });
    return xml;
  } catch (error) {
    logger.error(
      "Failed to generate sitemap",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml +=
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  for (const entry of entries) {
    xml += "  <url>\n";
    xml += `    <loc>${escapeXml(buildAbsoluteUrl(entry.loc))}</loc>\n`;
    if (entry.lastmod) {
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    }
    if (entry.priority !== undefined) {
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
    }
    for (const image of entry.images || []) {
      xml += "    <image:image>\n";
      xml += `      <image:loc>${escapeXml(buildAbsoluteUrl(image.loc))}</image:loc>\n`;
      if (image.title) {
        xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
      }
      xml += "    </image:image>\n";
    }
    xml += "  </url>\n";
  }

  xml += "</urlset>";
  return xml;
}

async function safeQueryMany(sql: string, label: string): Promise<any[]> {
  try {
    return await queryMany(sql);
  } catch (error) {
    logger.warn(`${label} unavailable, using curated sitemap fallback`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function toSitemapDate(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString().split("T")[0];
}

function getRowImages(row: any): string[] {
  const candidates = [
    row.image,
    row.image_url,
    row.cover_image,
    row.featured_image,
    row.featuredImage,
    row.thumbnail,
    ...(Array.isArray(row.images) ? row.images : []),
    ...(Array.isArray(row.gallery) ? row.gallery : []),
  ];

  return candidates.filter(
    (image): image is string => typeof image === "string" && image.length > 0,
  );
}

function buildImageEntries(
  images: string[],
  title?: string,
): SitemapEntry["images"] {
  return images.slice(0, 3).map((loc) => ({ loc, title }));
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

function dedupeEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const seen = new Set<string>();
  const deduped: SitemapEntry[] = [];

  for (const entry of entries) {
    const key = buildAbsoluteUrl(entry.loc);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function generateSitemapIndex(): Promise<string> {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const loc of ["/sitemap.xml", "/blog/sitemap.xml"]) {
    xml += `  <sitemap>\n`;
    xml += `    <loc>${escapeXml(buildAbsoluteUrl(loc))}</loc>\n`;
    xml += `  </sitemap>\n`;
  }
  xml += "</sitemapindex>";
  return xml;
}

function buildAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}`;
}
