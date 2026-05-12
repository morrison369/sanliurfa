import type { APIRoute } from 'astro';
import { authenticateUser } from '../../../../lib/auth/middleware';
import { query } from '../../../../lib/postgres';
import { problemJson, safeErrorDetail, safeIntParam } from '../../../../lib/api';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-places-lifecycle-unauthorized',
        instance: '/api/admin/places/lifecycle',
      });
    }

    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');
    const toStatus = url.searchParams.get('toStatus');
    const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 200);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

    const where: string[] = [];
    const params: unknown[] = [];
    if (placeId) {
      params.push(placeId);
      where.push(`e.place_id = $${params.length}`);
    }
    if (toStatus) {
      params.push(toStatus);
      where.push(`e.to_status = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM place_lifecycle_events e
       ${whereSql}`,
      params,
    );
    const listParams = [...params, limit, offset];
    const result = await query(
      `SELECT
        e.id,
        e.place_id,
        p.name AS place_name,
        e.from_status,
        e.to_status,
        e.actor_user_id,
        u.email AS actor_email,
        e.reason,
        e.metadata,
        e.created_at
       FROM place_lifecycle_events e
       LEFT JOIN places p ON p.id = e.place_id
       LEFT JOIN users u ON u.id = e.actor_user_id
       ${whereSql}
       ORDER BY e.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );

    return new Response(
      JSON.stringify({
        success: true,
        items: result.rows,
        total: Number(countResult.rows[0]?.total || 0),
        filters: { placeId, toStatus, limit, offset },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Mekan Lifecycle Timeline Alınamadı',
      detail: safeErrorDetail(error, 'admin_places_lifecycle_fetch_failed'),
      type: '/problems/admin-places-lifecycle-fetch-failed',
      instance: '/api/admin/places/lifecycle',
    });
  }
};
