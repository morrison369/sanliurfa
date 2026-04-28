import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeIntParam } from '../../../lib/api';

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    if (!locals.user?.id) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/users-points-history-unauthorized',
        instance: '/api/users/points-history',
      });
    }

    const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 100);

    const history = await queryMany(
      `SELECT id, action_type, metadata, points_earned, created_at 
       FROM user_activity 
       WHERE user_id = $1 AND action_type IN ('review_created', 'comment_posted', 'favorite_added')
       ORDER BY created_at DESC
       LIMIT $2`,
      [locals.user.id, limit]
    );

    const summary = await queryMany(
      `SELECT action_type, COUNT(*) as count, COALESCE(SUM((metadata->>'points')::int), 0) as total_points
       FROM user_activity 
       WHERE user_id = $1 AND action_type IN ('review_created', 'comment_posted', 'favorite_added')
       GROUP BY action_type`,
      [locals.user.id]
    );

    return apiResponse({
      success: true,
      data: {
        history: history || [],
        summary: summary || []
      }
    }, HttpStatus.OK);
  } catch (error) {
    logger.error('Points history error', error);
    return problemJson({
      status: 500,
      title: 'Puan Geçmişi Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/users-points-history-failed',
      instance: '/api/users/points-history',
    });
  }
};
