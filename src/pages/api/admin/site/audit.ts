import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail, safeIntParam } from '../../../../lib/api';
import { query } from '../../../../lib/postgres';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const key = String(url.searchParams.get('key') || '').trim();
  const action = String(url.searchParams.get('action') || '').trim();
  const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 200);
  const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

  const where: string[] = [];
  const params: unknown[] = [];

  if (key) {
    params.push(key);
    where.push(`setting_key = $${params.length}`);
  }
  if (action) {
    params.push(action);
    where.push(`action = $${params.length}`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const listParams = [...params, limit, offset];
  try {
    const [countResult, result] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total FROM site_change_audit ${whereSql}`,
        params,
      ),
      query(
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
      ),
    ]);

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
        error: safeErrorDetail(error, 'audit list failed'),
      },
      500,
    );
  }
};
