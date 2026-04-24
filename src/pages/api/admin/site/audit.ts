import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(locals: any) {
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const key = String(url.searchParams.get('key') || '').trim();
  const action = String(url.searchParams.get('action') || '').trim();
  const limitRaw = Number(url.searchParams.get('limit') || 50);
  const offsetRaw = Number(url.searchParams.get('offset') || 0);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

  const where: string[] = [];
  const params: any[] = [];

  if (key) {
    params.push(key);
    where.push(`setting_key = $${params.length}`);
  }
  if (action) {
    params.push(action);
    where.push(`action = $${params.length}`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const countResult = await query(
      `
      SELECT COUNT(*)::int AS total
      FROM site_change_audit
      ${whereSql}
      `,
      params,
    );

    const listParams = [...params, limit, offset];
    const result = await query(
      `
      SELECT
        id,
        setting_key,
        action,
        actor_user_id,
        actor_email,
        ip_address::text AS ip_address,
        user_agent,
        metadata,
        created_at
      FROM site_change_audit
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
      `,
      listParams,
    );

    return json({
      success: true,
      items: result.rows,
      total: Number(countResult.rows[0]?.total || 0),
      filters: { key: key || null, action: action || null, limit, offset },
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'audit list failed',
      },
      500,
    );
  }
};
