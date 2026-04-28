import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail, safeIntParam } from '../../../../lib/api';
import { query } from '../../../../lib/postgres';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);
  try {
    const result = await query(
      `SELECT tenant_id, swipe_limit, swipe_window_seconds, follow_limit, follow_window_seconds,
              message_write_limit, message_write_window_seconds, is_active, note, updated_at
       FROM tenant_social_policies
       ORDER BY tenant_id ASC`,
    );
    return json({ success: true, items: result.rows });
  } catch (error) {
    return json(
      { success: false, error: safeErrorDetail(error, 'policy list failed') },
      500,
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Gecersiz JSON' }, 400);
  }

  const tenantId = String(body?.tenantId || '').trim();
  if (!tenantId) return json({ error: 'tenantId zorunlu' }, 400);

  const swipeLimit = safeIntParam(body?.swipeLimit, 120, 1, 10_000);
  const swipeWindowSeconds = safeIntParam(body?.swipeWindowSeconds, 60, 10, 86_400);
  const followLimit = safeIntParam(body?.followLimit, 60, 1, 10_000);
  const followWindowSeconds = safeIntParam(body?.followWindowSeconds, 60, 10, 86_400);
  const messageWriteLimit = safeIntParam(body?.messageWriteLimit, 80, 1, 10_000);
  const messageWriteWindowSeconds = safeIntParam(body?.messageWriteWindowSeconds, 60, 10, 86_400);
  const isActive = body?.isActive !== false;
  const noteRaw = body?.note ? String(body.note) : null;
  if (noteRaw !== undefined && noteRaw !== null && (typeof noteRaw !== 'string' || noteRaw.length > 500)) return json({ error: 'Not 500 karakteri aşamaz' }, 422);
  const note = noteRaw;
  const updatedBy = locals?.user?.id ? String(locals.user.id) : null;

  try {
    await query(
      `INSERT INTO tenant_social_policies (
          tenant_id,
          swipe_limit, swipe_window_seconds,
          follow_limit, follow_window_seconds,
          message_write_limit, message_write_window_seconds,
          is_active, note, updated_by, updated_at
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET
         swipe_limit = EXCLUDED.swipe_limit,
         swipe_window_seconds = EXCLUDED.swipe_window_seconds,
         follow_limit = EXCLUDED.follow_limit,
         follow_window_seconds = EXCLUDED.follow_window_seconds,
         message_write_limit = EXCLUDED.message_write_limit,
         message_write_window_seconds = EXCLUDED.message_write_window_seconds,
         is_active = EXCLUDED.is_active,
         note = EXCLUDED.note,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [
        tenantId,
        swipeLimit,
        swipeWindowSeconds,
        followLimit,
        followWindowSeconds,
        messageWriteLimit,
        messageWriteWindowSeconds,
        isActive,
        note,
        updatedBy,
      ],
    );
    return json({ success: true, tenantId });
  } catch (error) {
    return json(
      { success: false, error: safeErrorDetail(error, 'policy upsert failed') },
      500,
    );
  }
};
