import type { APIRoute } from 'astro';
import { authenticateUser } from '../../../../lib/auth/middleware';
import { query } from '../../../../lib/postgres';
import { problemJson, safeErrorDetail, safeIntParam } from '../../../../lib/api';

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString('base64url');
}

function decodeCursor(cursor: string | null): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [createdAt, id] = decoded.split('|');
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-social-events-unauthorized',
        instance: '/api/admin/social/events',
      });
    }

    const url = new URL(context.request.url);
    const rawEventType = url.searchParams.get('eventType');
    const eventType = rawEventType ? rawEventType.substring(0, 100) : null;
    const actorUserId = url.searchParams.get('actorUserId');
    const targetUserId = url.searchParams.get('targetUserId');
    const tenantId = url.searchParams.get('tenantId');
    const cursor = decodeCursor(url.searchParams.get('cursor'));
    const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 200);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

    const where: string[] = [];
    const params: unknown[] = [];
    if (eventType) {
      params.push(eventType);
      where.push(`event_type = $${params.length}`);
    }
    if (actorUserId) {
      params.push(actorUserId);
      where.push(`actor_user_id = $${params.length}`);
    }
    if (targetUserId) {
      params.push(targetUserId);
      where.push(`target_user_id = $${params.length}`);
    }
    if (tenantId) {
      params.push(tenantId);
      where.push(`tenant_id = $${params.length}`);
    }
    if (cursor) {
      params.push(cursor.createdAt);
      params.push(cursor.id);
      where.push(`(created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM social_event_store ${whereSql}`,
      params,
    );
    const listParams = cursor ? [...params, limit] : [...params, limit, offset];
    const result = await query(
      `SELECT id, event_type, actor_user_id, target_user_id, conversation_id, metadata, created_at
       FROM social_event_store
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${cursor ? listParams.length : listParams.length - 1}
       ${cursor ? '' : `OFFSET $${listParams.length}`}`,
      listParams,
    );
    const lastRow = result.rows[result.rows.length - 1];
    const nextCursor =
      lastRow?.created_at && lastRow?.id
        ? encodeCursor(String(lastRow.created_at), String(lastRow.id))
        : null;

    return new Response(
      JSON.stringify({
        success: true,
        items: result.rows,
        total: Number(countResult.rows[0]?.total || 0),
        nextCursor,
        filters: { eventType, actorUserId, targetUserId, tenantId, limit, offset, cursor: cursor ? 'set' : null },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Sosyal Event Timeline Alınamadı',
      detail: safeErrorDetail(error, 'admin_social_events_fetch_failed'),
      type: '/problems/admin-social-events-fetch-failed',
      instance: '/api/admin/social/events',
    });
  }
};
