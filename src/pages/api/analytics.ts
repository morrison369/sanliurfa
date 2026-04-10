import type { APIRoute } from 'astro';
import { queryOne, queryRows } from '../../lib/postgres';

export const GET: APIRoute = async ({ locals }) => {
  try {
    if (!locals.user?.isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    const totalUsers = await queryOne('SELECT COUNT(*) as count FROM users');
    const totalReviews = await queryOne('SELECT COUNT(*) as count FROM reviews');
    const totalPlaces = await queryOne('SELECT COUNT(*) as count FROM places');
    const avgRating = await queryOne('SELECT AVG(rating) as avg FROM reviews');
    const activeToday = await queryOne(
      `SELECT COUNT(DISTINCT user_id) as count FROM user_activity WHERE created_at > NOW() - INTERVAL '24 hours'`
    );

    const topPlaces = await queryRows(
      `SELECT id, name, (SELECT AVG(rating) FROM reviews WHERE place_id = places.id) as avg_rating, 
              (SELECT COUNT(*) FROM reviews WHERE place_id = places.id) as review_count 
       FROM places ORDER BY avg_rating DESC LIMIT 5`
    );

    const topUsers = await queryRows(
      `SELECT id, full_name, (SELECT COUNT(*) FROM reviews WHERE user_id = users.id) as review_count, points 
       FROM users ORDER BY points DESC LIMIT 5`
    );

    return new Response(JSON.stringify({
      success: true,
      data: {
        summary: {
          totalUsers: parseInt(totalUsers?.count || '0'),
          totalReviews: parseInt(totalReviews?.count || '0'),
          totalPlaces: parseInt(totalPlaces?.count || '0'),
          avgRating: parseFloat(avgRating?.avg || '0').toFixed(2),
          activeToday: parseInt(activeToday?.count || '0')
        },
        topPlaces,
        topUsers
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Analytics error', error);
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
};
