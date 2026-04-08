import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    if (!locals.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

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

    return new Response(JSON.stringify({
      success: true,
      data: recommendations.rows || []
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Recommendations error', error);
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
};
