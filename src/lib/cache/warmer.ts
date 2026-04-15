/**
 * Cache Warmer
 * Pre-populates cache with frequently accessed data
 */

import { setCache } from './index';
import { query } from '../postgres';
import { warmCache } from './strategies';
import { logger } from '../logging';

/**
 * Warm homepage cache
 */
export async function warmHomepageCache(): Promise<void> {
  logger.info('🌡️ Warming homepage cache...');

  // Featured places
  const featuredPlaces = await query(
    `SELECT id, slug, name, category, rating, image 
     FROM places 
     WHERE is_featured = true 
     ORDER BY rating DESC 
     LIMIT 6`
  );

  await setCache('homepage:featured', featuredPlaces.rows, 3600);

  // Recent blog posts
  const recentPosts = await query(
    `SELECT id, slug, title, excerpt, cover_image, published_at
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY published_at DESC
     LIMIT 4`
  );

  await setCache('homepage:recent_posts', recentPosts.rows, 1800);

  // Statistics
  const stats = await query(
    `SELECT 
      (SELECT COUNT(*) FROM places)::int as total_places,
      (SELECT COUNT(*) FROM reviews)::int as total_reviews`
  );

  await setCache('homepage:stats', stats.rows[0], 3600);

  logger.info('✅ Homepage cache warmed');
}

/**
 * Warm places cache
 */
export async function warmPlacesCache(): Promise<void> {
  logger.info('🌡️ Warming places cache...');

  // Popular places by category
  const categories = ['tarihi-yerler', 'restoran', 'otel', 'kafe'];

  for (const category of categories) {
    const places = await query(
      `SELECT id, slug, name, category, rating, review_count, image
       FROM places
       WHERE category = $1
       ORDER BY rating DESC, review_count DESC
       LIMIT 20`,
      [category]
    );

    await setCache(`places:category:${category}`, places.rows, 3600);
  }

  // Top rated places
  const topRated = await query(
    `SELECT id, slug, name, category, rating
     FROM places
     ORDER BY rating DESC
     LIMIT 20`
  );

  await setCache('places:top_rated', topRated.rows, 3600);

  logger.info('✅ Places cache warmed');
}

/**
 * Warm blog cache
 */
export async function warmBlogCache(): Promise<void> {
  logger.info('🌡️ Warming blog cache...');

  // Popular posts
  const popularPosts = await query(
    `SELECT id, slug, title, excerpt, cover_image, published_at, views
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY views DESC
     LIMIT 10`
  );

  await setCache('blog:popular', popularPosts.rows, 3600);

  // Categories with counts
  const categories = await query(
    `SELECT category, COUNT(*) as count
     FROM blog_posts
     WHERE status = 'published'
     GROUP BY category
     ORDER BY count DESC`
  );

  await setCache('blog:categories', categories.rows, 7200);

  logger.info('✅ Blog cache warmed');
}

/**
 * Warm search cache
 */
export async function warmSearchCache(): Promise<void> {
  logger.info('🌡️ Warming search cache...');

  // Popular search suggestions
  const popularSearches = await query(
    `SELECT query, COUNT(*) as count
     FROM search_logs
     WHERE created_at > NOW() - INTERVAL '7 days'
     GROUP BY query
     ORDER BY count DESC
     LIMIT 20`
  );

  await setCache('search:popular', popularSearches.rows, 3600);

  // Autocomplete data
  const placeNames = await query(
    `SELECT name, slug, category
     FROM places
     ORDER BY rating DESC
     LIMIT 100`
  );

  await setCache('search:autocomplete', placeNames.rows, 7200);

  logger.info('✅ Search cache warmed');
}

/**
 * Warm all caches
 */
export async function warmAllCaches(): Promise<void> {
  logger.info('🔥 Starting cache warm-up...\n');

  const startTime = Date.now();

  try {
    await warmHomepageCache();
    await warmPlacesCache();
    await warmBlogCache();
    await warmSearchCache();

    const duration = Date.now() - startTime;
    logger.info(`\n✅ Cache warm-up completed in ${duration}ms`);
  } catch (error) {
    logger.error('❌ Cache warm-up failed:', error);
    throw error;
  }
}

/**
 * Schedule periodic cache warming
 */
export function scheduleCacheWarming(intervalMinutes = 30): void {
  logger.info(`📅 Scheduled cache warming every ${intervalMinutes} minutes`);

  // Initial warm
  warmAllCaches().catch(console.error);

  // Periodic warm
  setInterval(() => {
    warmAllCaches().catch(console.error);
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
