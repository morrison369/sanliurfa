import type { APIRoute } from 'astro';
import { queryOne, queryMany } from '../../lib/postgres';
import { logger } from '../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../lib/api';

interface CountRow {
  count: string | number;
}

interface AvgRow {
  avg: string | number | null;
}

function toInteger(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Math.trunc(value);
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  return 0;
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    if (locals.user?.role !== 'admin') {
      return problemJson({
        status: 403,
        title: 'Yetkisiz İşlem',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/analytics-unauthorized',
        instance: '/api/analytics',
      });
    }

    const [totalUsers, totalReviews, totalPlaces, avgRating, activeToday, topPlaces, topUsers] = await Promise.all([
      queryOne<CountRow>('SELECT COUNT(*) as count FROM users'),
      queryOne<CountRow>('SELECT COUNT(*) as count FROM reviews'),
      queryOne<CountRow>('SELECT COUNT(*) as count FROM places'),
      queryOne<AvgRow>('SELECT AVG(rating) as avg FROM reviews'),
      queryOne<CountRow>(
        `SELECT COUNT(DISTINCT user_id) as count FROM user_activity WHERE created_at > NOW() - INTERVAL '24 hours'`
      ),
      queryMany(
        `SELECT p.id, p.name,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(r.id) as review_count
         FROM places p
         LEFT JOIN reviews r ON r.place_id = p.id
         GROUP BY p.id, p.name
         ORDER BY avg_rating DESC LIMIT 5`
      ),
      queryMany(
        `SELECT u.id, u.full_name,
                COUNT(r.id) as review_count,
                u.points
         FROM users u
         LEFT JOIN reviews r ON r.user_id = u.id
         GROUP BY u.id, u.full_name, u.points
         ORDER BY u.points DESC LIMIT 5`
      ),
    ]);

    return apiResponse({
      success: true,
      data: {
        summary: {
          totalUsers: toInteger(totalUsers?.count),
          totalReviews: toInteger(totalReviews?.count),
          totalPlaces: toInteger(totalPlaces?.count),
          avgRating: parseFloat(String(avgRating?.avg || '0')).toFixed(2),
          activeToday: toInteger(activeToday?.count)
        },
        topPlaces,
        topUsers
      }
    }, HttpStatus.OK);
  } catch (error) {
    logger.error('Analytics error', error);
    return problemJson({
      status: 500,
      title: 'Analitik Verisi Alınamadı',
      detail: safeErrorDetail(error, 'analytics_failed'),
      type: '/problems/analytics-fetch-failed',
      instance: '/api/analytics',
    });
  }
};

