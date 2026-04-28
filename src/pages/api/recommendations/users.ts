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
        type: '/problems/recommendations-users-unauthorized',
        instance: '/api/recommendations/users',
      });
    }

    const limit = safeIntParam(url.searchParams.get('limit'), 10, 1, 50);

    const recommendations = await queryMany(
      `SELECT u.id, u.full_name, u.avatar_url, u.level, u.points,
              (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as review_count
       FROM users u
       WHERE u.id != $1
       AND u.id NOT IN (SELECT following_id FROM followers WHERE follower_id = $1)
       AND u.role = 'user'
       ORDER BY u.points DESC, u.level DESC
       LIMIT $2`,
      [locals.user.id, limit]
    );

    return apiResponse({
      success: true,
      data: recommendations || []
    }, HttpStatus.OK);
  } catch (error) {
    logger.error('Recommendations error', error);
    return problemJson({
      status: 500,
      title: 'Kullanıcı Önerileri Alınamadı',
      detail: 'Failed',
      type: '/problems/recommendations-users-failed',
      instance: '/api/recommendations/users',
    });
  }
};
