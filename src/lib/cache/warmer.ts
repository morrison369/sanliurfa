/**
 * Cache Warmer
 * Pre-populates cache with frequently accessed data
 */

import { setCache } from './index';
import { query } from '../postgres';
import { logger } from '../logging';

/**
 * Warm homepage cache
 */
export async function warmHomepageCache(): Promise<void> {
  logger.info('🌡️ Warming homepage cache...');

  const [featuredPlaces, recentPosts, stats] = await Promise.all([
    query(
      `SELECT id, slug, name, category, rating, COALESCE(thumbnail_url, images[1]) as image
       FROM places
       WHERE is_featured = true
       ORDER BY rating DESC
       LIMIT 6`
    ),
    query(
      `SELECT id, slug, title, excerpt, cover_image, published_at
       FROM blog_posts
       WHERE status = 'published'
       ORDER BY published_at DESC
       LIMIT 4`
    ),
    query(
      `SELECT
        (SELECT COUNT(*) FROM places)::int as total_places,
        (SELECT COUNT(*) FROM reviews)::int as total_reviews`
    ),
  ]);

  await Promise.all([
    setCache('homepage:featured', featuredPlaces.rows, 3600),
    setCache('homepage:recent_posts', recentPosts.rows, 1800),
    setCache('homepage:stats', stats.rows[0], 3600),
  ]);

  logger.info('✅ Homepage cache warmed');
}

/**
 * Warm places cache
 */
export async function warmPlacesCache(): Promise<void> {
  logger.info('🌡️ Warming places cache...');

  const categories = ['tarihi-yerler', 'restoran', 'otel', 'kafe'];

  await Promise.all([
    ...categories.map(async (category) => {
      const places = await query(
        `SELECT id, slug, name, category, rating, review_count, COALESCE(thumbnail_url, images[1]) as image
         FROM places
         WHERE category = $1
         ORDER BY rating DESC, review_count DESC
         LIMIT 20`,
        [category]
      );
      await setCache(`places:category:${category}`, places.rows, 3600);
    }),
    (async () => {
      const topRated = await query(
        `SELECT id, slug, name, category, rating
         FROM places
         ORDER BY rating DESC
         LIMIT 20`
      );
      await setCache('places:top_rated', topRated.rows, 3600);
    })(),
  ]);

  logger.info('✅ Places cache warmed');
}

/**
 * Warm blog cache
 */
export async function warmBlogCache(): Promise<void> {
  logger.info('🌡️ Warming blog cache...');

  const [popularPosts, categories] = await Promise.all([
    query(
      `SELECT id, slug, title, excerpt, cover_image, published_at, views
       FROM blog_posts
       WHERE status = 'published'
       ORDER BY views DESC
       LIMIT 10`
    ),
    query(
      `SELECT category, COUNT(*) as count
       FROM blog_posts
       WHERE status = 'published'
       GROUP BY category
       ORDER BY count DESC`
    ),
  ]);

  await Promise.all([
    setCache('blog:popular', popularPosts.rows, 3600),
    setCache('blog:categories', categories.rows, 7200),
  ]);

  logger.info('✅ Blog cache warmed');
}

/**
 * Warm search cache
 */
export async function warmSearchCache(): Promise<void> {
  logger.info('🌡️ Warming search cache...');

  const [popularSearches, placeNames] = await Promise.all([
    query(
      `SELECT query, COUNT(*) as count
       FROM search_logs
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY query
       ORDER BY count DESC
       LIMIT 20`
    ),
    query(
      `SELECT name, slug, category
       FROM places
       ORDER BY rating DESC
       LIMIT 100`
    ),
  ]);

  await Promise.all([
    setCache('search:popular', popularSearches.rows, 3600),
    setCache('search:autocomplete', placeNames.rows, 7200),
  ]);

  logger.info('✅ Search cache warmed');
}

/**
 * Warm all caches
 */
export async function warmAllCaches(): Promise<void> {
  logger.info('🔥 Starting cache warm-up...\n');

  const startTime = Date.now();

  // allSettled: bir warm fail olsa diğerleri devam etsin (per-cache isolation)
  const settled = await Promise.allSettled([
    warmHomepageCache(),
    warmPlacesCache(),
    warmBlogCache(),
    warmSearchCache(),
  ]);

  const failed = settled.filter((r) => r.status === 'rejected');
  const duration = Date.now() - startTime;

  if (failed.length === 0) {
    logger.info(`\n✅ Cache warm-up completed in ${duration}ms`);
  } else {
    failed.forEach((r) => {
      const reason = (r as PromiseRejectedResult).reason;
      logger.error('Cache warm partial failure', reason instanceof Error ? reason : new Error(String(reason)));
    });
    logger.warn(`Cache warm-up completed with ${failed.length}/${settled.length} failure(s) in ${duration}ms`);
  }
}

/**
 * Schedule periodic cache warming
 */
export function scheduleCacheWarming(intervalMinutes = 30): void {
  logger.info(`📅 Scheduled cache warming every ${intervalMinutes} minutes`);

  // Initial warm
  warmAllCaches().catch((err) => logger.error('Cache warming failed', err instanceof Error ? err : new Error(String(err))));

  // Periodic warm
  setInterval(() => {
    warmAllCaches().catch((err) => logger.error('Cache warming failed', err instanceof Error ? err : new Error(String(err))));
  }, intervalMinutes * 60 * 1000);
}

/**
 * Clear and rewarm specific cache
 */
export async function refreshCache(key: string): Promise<void> {
  logger.info(`🔄 Refreshing cache: ${key}`);

  switch (key) {
    case 'homepage':
      await warmHomepageCache();
      break;
    case 'places':
      await warmPlacesCache();
      break;
    case 'blog':
      await warmBlogCache();
      break;
    case 'search':
      await warmSearchCache();
      break;
    case 'all':
      await warmAllCaches();
      break;
    default:
      logger.warn(`Unknown cache key: ${key}`);
  }
}

