import { getCuratedBlogPosts } from '../data/curated-blog-posts';
import { getCuratedPlaces } from '../data/curated-places';
import { query } from './postgres';
import { evaluatePlaceQuality, normalizePlaceImages } from './place-quality';

export interface HomepagePlaceItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description: string;
  category: string;
  address: string;
  images: string[];
  image_url: string | null;
  rating: number;
  review_count: number;
  price_range: number;
  tags: string[];
  is_featured: boolean;
  is_verified: boolean;
  status: 'active';
}

export interface HomepageBlogItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  full_name: string;
  published_at: string;
}

export interface HomepageQualityKpis {
  activePlaceCount: number;
  publishReadyPlaceCount: number;
  placesWithoutImageCount: number;
  placeImageCoveragePercent: number;
  placePublishReadinessPercent: number;
  publishedBlogCount: number;
  blogWithoutImageCount: number;
  blogImageCoveragePercent: number;
}

export interface HomepageData {
  places: HomepagePlaceItem[];
  posts: HomepageBlogItem[];
  kpis: HomepageQualityKpis;
}

interface HomepageDataOptions {
  placesLimit?: number;
  postsLimit?: number;
}

const DEFAULT_PLACE_LIMIT = 8;
const DEFAULT_POST_LIMIT = 6;

export async function getHomepageData(options: HomepageDataOptions = {}): Promise<HomepageData> {
  const placesLimit = normalizeLimit(options.placesLimit, DEFAULT_PLACE_LIMIT);
  const postsLimit = normalizeLimit(options.postsLimit, DEFAULT_POST_LIMIT);

  const fallbackPlaces = getCuratedPlaces(placesLimit).map(mapCuratedPlace);
  const fallbackPosts = getCuratedBlogPosts().slice(0, postsLimit).map(mapCuratedPost);

  let places = fallbackPlaces;
  let posts = fallbackPosts;

  try {
    const placeResult = await query(
      `SELECT id, slug, name, description, short_description, category, address, images, image_url,
              COALESCE(avg_rating, rating, 0) AS rating, COALESCE(review_count, 0) AS review_count,
              COALESCE(price_range, 2) AS price_range, tags, is_featured, is_verified, status
         FROM places
        WHERE status = 'active'
        ORDER BY is_featured DESC, COALESCE(avg_rating, rating, 0) DESC, COALESCE(review_count, 0) DESC
        LIMIT $1`,
      [placesLimit],
      { useReplica: true },
    );

    if (placeResult.rows.length > 0) {
      places = placeResult.rows.map(mapDbPlace).filter((item) => item.slug);
    }
  } catch {
    places = fallbackPlaces;
  }

  try {
    const postResult = await query(
      `SELECT bp.id, bp.slug, bp.title, bp.excerpt, bp.content, bp.cover_image, bp.category,
              bp.published_at, u.full_name
         FROM blog_posts bp
         LEFT JOIN users u ON bp.author_id = u.id
        WHERE bp.status = 'published'
        ORDER BY bp.is_featured DESC, bp.published_at DESC
        LIMIT $1`,
      [postsLimit],
      { useReplica: true },
    );

    if (postResult.rows.length > 0) {
      posts = postResult.rows.map(mapDbPost).filter((item) => item.slug);
    }
  } catch {
    posts = fallbackPosts;
  }

  const kpis = await getHomepageQualityKpis(places, posts);
  return { places, posts, kpis };
}

async function getHomepageQualityKpis(
  fallbackPlaces: HomepagePlaceItem[],
  fallbackPosts: HomepageBlogItem[],
): Promise<HomepageQualityKpis> {
  try {
    const [placeResult, postResult] = await Promise.all([
      query(
        `SELECT id, name, category, description, short_description, address, phone, latitude, longitude, image_url, images, status
           FROM places
          WHERE status = 'active'
          LIMIT 5000`,
        [],
        { useReplica: true },
      ),
      query(
        `SELECT id, cover_image, status
           FROM blog_posts
          WHERE status = 'published'
          LIMIT 5000`,
        [],
        { useReplica: true },
      ),
    ]);

    const placeRows = placeResult.rows;
    const publishReady = placeRows.filter((row) =>
      evaluatePlaceQuality({
        name: row.name,
        category: row.category,
        description: row.description,
        shortDescription: row.short_description,
        address: row.address,
        phone: row.phone,
        latitude: row.latitude,
        longitude: row.longitude,
        imageUrl: row.image_url,
        images: row.images,
        status: row.status,
      }).isPublishable,
    ).length;

    const placesWithoutImageCount = placeRows.filter((row) =>
      normalizePlaceImages(row.images, row.image_url).length === 0,
    ).length;

    const publishedBlogCount = postResult.rows.length;
    const blogWithoutImageCount = postResult.rows.filter((row) => !hasText(row.cover_image)).length;

    return {
      activePlaceCount: placeRows.length,
      publishReadyPlaceCount: publishReady,
      placesWithoutImageCount,
      placeImageCoveragePercent: toPercent(placeRows.length - placesWithoutImageCount, placeRows.length),
      placePublishReadinessPercent: toPercent(publishReady, placeRows.length),
      publishedBlogCount,
      blogWithoutImageCount,
      blogImageCoveragePercent: toPercent(publishedBlogCount - blogWithoutImageCount, publishedBlogCount),
    };
  } catch {
    const activePlaceCount = fallbackPlaces.length;
    const placesWithoutImageCount = fallbackPlaces.filter((item) => item.images.length === 0).length;
    const publishedBlogCount = fallbackPosts.length;
    const blogWithoutImageCount = fallbackPosts.filter((item) => !hasText(item.cover_image)).length;

    return {
      activePlaceCount,
      publishReadyPlaceCount: activePlaceCount,
      placesWithoutImageCount,
      placeImageCoveragePercent: toPercent(activePlaceCount - placesWithoutImageCount, activePlaceCount),
      placePublishReadinessPercent: 100,
      publishedBlogCount,
      blogWithoutImageCount,
      blogImageCoveragePercent: toPercent(publishedBlogCount - blogWithoutImageCount, publishedBlogCount),
    };
  }
}

function mapCuratedPlace(item: ReturnType<typeof getCuratedPlaces>[number]): HomepagePlaceItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    short_description: item.description.slice(0, 160),
    category: item.category,
    address: item.address,
    images: item.images || [],
    image_url: item.images?.[0] || null,
    rating: Number(item.rating || 0),
    review_count: Number(item.review_count || 0),
    price_range: Number(item.price_range || 2),
    tags: item.tags || [],
    is_featured: Boolean(item.is_featured),
    is_verified: Boolean(item.is_verified),
    status: 'active',
  };
}

function mapDbPlace(row: Record<string, any>): HomepagePlaceItem {
  const images = normalizePlaceImages(row.images, row.image_url);
  return {
    id: String(row.id || ''),
    slug: String(row.slug || ''),
    name: String(row.name || ''),
    description: String(row.description || ''),
    short_description: String(row.short_description || row.description || ''),
    category: String(row.category || 'other'),
    address: String(row.address || ''),
    images,
    image_url: typeof row.image_url === 'string' ? row.image_url : images[0] || null,
    rating: Number(row.rating || 0),
    review_count: Number(row.review_count || 0),
    price_range: Number(row.price_range || 2),
    tags: normalizeStringArray(row.tags),
    is_featured: Boolean(row.is_featured),
    is_verified: Boolean(row.is_verified),
    status: 'active',
  };
}

function mapCuratedPost(item: ReturnType<typeof getCuratedBlogPosts>[number]): HomepageBlogItem {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    content: item.content,
    cover_image: item.cover_image || item.featuredImage,
    category: item.category,
    full_name: item.authorName || 'Editör',
    published_at: item.publishedAt.toISOString(),
  };
}

function mapDbPost(row: Record<string, any>): HomepageBlogItem {
  return {
    id: String(row.id || ''),
    slug: String(row.slug || ''),
    title: String(row.title || ''),
    excerpt: String(row.excerpt || ''),
    content: String(row.content || ''),
    cover_image: String(row.cover_image || '/images/placeholder-blog.jpg'),
    category: String(row.category || 'genel'),
    full_name: hasText(row.full_name) ? String(row.full_name) : 'Editör',
    published_at: row.published_at ? new Date(row.published_at).toISOString() : new Date().toISOString(),
  };
}

function normalizeStringArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof input === 'string' && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return input
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeLimit(input: number | undefined, fallback: number): number {
  if (!Number.isFinite(input)) {
    return fallback;
  }
  const normalized = Number(input);
  if (normalized < 1) {
    return fallback;
  }
  return Math.min(Math.floor(normalized), 20);
}

function toPercent(numerator: number, denominator: number): number {
  if (!denominator) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
