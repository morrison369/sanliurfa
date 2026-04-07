/**
 * Analytics Sistemi - Ziyaretçi, görüntüleme ve kullanım istatistikleri
 */

import { pool } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export async function recordPageView(pagePath: string, userId?: string, referrer?: string, ipAddress?: string, userAgent?: string, sessionId?: string, durationMs?: number): Promise<void> {
  try {
    await pool.query(`INSERT INTO page_views (page_path, user_id, referrer, ip_address, user_agent, session_id, duration_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [pagePath, userId || null, referrer || null, ipAddress || null, userAgent || null, sessionId || null, durationMs || null]);
  } catch (error) {
    logger.error('Sayfa görüntülemesi kaydedilirken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function recordPlaceView(placeId: string, userId?: string, ipAddress?: string, sessionId?: string): Promise<void> {
  try {
    await pool.query(`INSERT INTO place_views (place_id, user_id, ip_address, session_id) VALUES ($1, $2, $3, $4)`, [placeId, userId || null, ipAddress || null, sessionId || null]);
    await invalidatePopularPlacesCache();
  } catch (error) {
    logger.error('Yer görüntülemesi kaydedilirken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function recordUserAction(actionType: string, userId?: string, resourceType?: string, resourceId?: string, metadata?: Record<string, any>, ipAddress?: string): Promise<void> {
  try {
    await pool.query(`INSERT INTO user_actions (action_type, user_id, resource_type, resource_id, metadata, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`, [actionType, userId || null, resourceType || null, resourceId || null, metadata ? JSON.stringify(metadata) : null, ipAddress || null]);
  } catch (error) {
    logger.error('Kullanıcı aksiyonu kaydedilirken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getPopularPlaces(limit: number = 20, days: number = 30): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:analytics:popular:${days}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await pool.query(`SELECT p.id, p.name, p.slug, p.category, p.rating, COUNT(pv.id) as view_count, COUNT(DISTINCT pv.user_id) as unique_viewers FROM places p LEFT JOIN place_views pv ON p.id = pv.place_id WHERE pv.created_at >= NOW() - INTERVAL '${days} days' GROUP BY p.id ORDER BY view_count DESC LIMIT $1`, [limit]);

    await setCache(cacheKey, JSON.stringify(result.rows), 3600);
    return result.rows;
  } catch (error) {
    logger.error('Popüler yerler alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getWeeklySummary(): Promise<any> {
  try {
    const cacheKey = 'sanliurfa:analytics:weekly:summary';
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await pool.query(`SELECT COUNT(DISTINCT id) as total_page_views, COUNT(DISTINCT user_id) as unique_users, COUNT(DISTINCT session_id) as unique_sessions, ROUND(AVG(duration_ms)::numeric, 0) as avg_session_duration_ms FROM page_views WHERE created_at >= NOW() - INTERVAL '7 days'`);

    const summary = { period: 'last_7_days', ...result.rows[0], generated_at: new Date().toISOString() };
    await setCache(cacheKey, JSON.stringify(summary), 3600);
    return summary;
  } catch (error) {
    logger.error('Haftalık özet alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return {};
  }
}

export async function getCategoryStats(): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:analytics:category:stats';
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await pool.query(`SELECT p.category, COUNT(DISTINCT p.id) as place_count, COUNT(pv.id) as total_views, COUNT(DISTINCT pv.user_id) as unique_viewers FROM places p LEFT JOIN place_views pv ON p.id = pv.place_id AND pv.created_at >= NOW() - INTERVAL '30 days' GROUP BY p.category ORDER BY total_views DESC`);

    await setCache(cacheKey, JSON.stringify(result.rows), 7200);
    return result.rows;
  } catch (error) {
    logger.error('Kategori istatistikleri alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getUserActivityAnalysis(userId: string): Promise<any> {
  try {
    const result = await pool.query(`SELECT COUNT(DISTINCT pv.id) as places_viewed, COUNT(DISTINCT r.id) as reviews_created, COUNT(DISTINCT f.id) as places_favorited FROM users u LEFT JOIN place_views pv ON u.id = pv.user_id AND pv.created_at >= NOW() - INTERVAL '90 days' LEFT JOIN reviews r ON u.id = r.user_id AND r.created_at >= NOW() - INTERVAL '90 days' LEFT JOIN favorites f ON u.id = f.user_id AND f.created_at >= NOW() - INTERVAL '90 days' WHERE u.id = $1`, [userId]);
    return result.rows[0] || {};
  } catch (error) {
    logger.error('Kullanıcı aktivitesi analizi yapılırken hata', error instanceof Error ? error : new Error(String(error)));
    return {};
  }
}

async function invalidatePopularPlacesCache(): Promise<void> {
  try {
    await deleteCache('sanliurfa:analytics:popular:30:20');
    await deleteCache('sanliurfa:analytics:popular:7:20');
  } catch (error) {
    logger.error('Cache silinirken hata', error instanceof Error ? error : new Error(String(error)));
  }
}
