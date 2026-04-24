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
      { success: false, error: error instanceof Error ? error.message : 'policy list failed' },
      500,
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Gecersiz JSON' }, 400);
  }

  const tenantId = String(body?.tenantId || '').trim();
  if (!tenantId) return json({ error: 'tenantId zorunlu' }, 400);

  const swipeLimit = Math.max(1, Number(body?.swipeLimit || 120));
  const swipeWindowSeconds = Math.max(10, Number(body?.swipeWindowSeconds || 60));
  const followLimit = Math.max(1, Number(body?.followLimit || 60));
  const followWindowSeconds = Math.max(10, Number(body?.followWindowSeconds || 60));
  const messageWriteLimit = Math.max(1, Number(body?.messageWriteLimit || 80));
  const messageWriteWindowSeconds = Math.max(10, Number(body?.messageWriteWindowSeconds || 60));
  const isActive = body?.isActive !== false;
  const note = body?.note ? String(body.note) : null;
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
      { success: false, error: error instanceof Error ? error.message : 'policy upsert failed' },
      500,
    );
  }
};
