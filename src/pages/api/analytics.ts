import type { APIRoute } from 'astro';
import { queryOne, queryMany } from '../../lib/postgres';
import { logger } from '../../lib/logging';
import { problemJson } from '../../lib/api';

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

    const totalUsers = await queryOne<CountRow>('SELECT COUNT(*) as count FROM users');
    const totalReviews = await queryOne<CountRow>('SELECT COUNT(*) as count FROM reviews');
    const totalPlaces = await queryOne<CountRow>('SELECT COUNT(*) as count FROM places');
    const avgRating = await queryOne<AvgRow>('SELECT AVG(rating) as avg FROM reviews');
    const activeToday = await queryOne<CountRow>(
      `SELECT COUNT(DISTINCT user_id) as count FROM user_activity WHERE created_at > NOW() - INTERVAL '24 hours'`
    );

    const topPlaces = await queryMany(
      `SELECT id, name, (SELECT AVG(rating) FROM reviews WHERE place_id = places.id) as avg_rating, 
              (SELECT COUNT(*) FROM reviews WHERE place_id = places.id) as review_count 
       FROM places ORDER BY avg_rating DESC LIMIT 5`
    );

    const topUsers = await queryMany(
      `SELECT id, full_name, (SELECT COUNT(*) FROM reviews WHERE user_id = users.id) as review_count, points 
       FROM users ORDER BY points DESC LIMIT 5`
    );

    return new Response(JSON.stringify({
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
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('Analytics error', error);
    return problemJson({
      status: 500,
      title: 'Analitik Verisi Alınamadı',
      detail: error instanceof Error ? error.message : 'failed',
      type: '/problems/analytics-fetch-failed',
      instance: '/api/analytics',
    });
  }
};

