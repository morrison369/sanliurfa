import type { APIRoute } from 'astro';
import { queryOne } from '../../../../../lib/postgres';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(locals: any) {
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

const ACTION_TO_COLUMNS: Record<string, { limit: string; window: string }> = {
  swipe: { limit: 'swipe_limit', window: 'swipe_window_seconds' },
  follow: { limit: 'follow_limit', window: 'follow_window_seconds' },
  message_write: { limit: 'message_write_limit', window: 'message_write_window_seconds' },
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Geçersiz JSON' }, 400);
  }

  const tenantId = String(body?.tenantId || 'default').trim();
  const action = String(body?.action || 'swipe').trim();
  const plannedCount = Number(body?.plannedCount || 0);
  const rps = Number(body?.rps || 0);
  const burst = Number(body?.burst || 0);
  const durationSeconds = Number(body?.durationSeconds || 60);
  if (!ACTION_TO_COLUMNS[action]) return json({ error: 'action geçersiz' }, 400);
  if (!Number.isFinite(plannedCount) || plannedCount < 0) return json({ error: 'plannedCount geçersiz' }, 400);

  try {
    const cols = ACTION_TO_COLUMNS[action];
    const policy = await queryOne<Record<string, any>>(
      `SELECT tenant_id, ${cols.limit} AS action_limit, ${cols.window} AS action_window
       FROM tenant_social_policies
       WHERE tenant_id = $1 AND is_active = true
       LIMIT 1`,
      [tenantId],
    );

    if (!policy) return json({ error: 'tenant policy bulunamadı' }, 404);
    const actionLimit = Number(policy.action_limit || 0);
    const actionWindow = Number(policy.action_window || 0);
    const remaining = Math.max(0, actionLimit - plannedCount);
    const projectedByRate = rps > 0 ? Math.round(rps * Math.max(1, durationSeconds)) : plannedCount;
    const projectedTotal = projectedByRate + Math.max(0, burst);
    const windowCapacity = actionLimit * Math.max(1, Math.ceil(durationSeconds / Math.max(1, actionWindow)));

    return json({
      success: true,
      tenantId,
      action,
      policy: {
        limit: actionLimit,
        windowSeconds: actionWindow,
      },
      simulation: {
        plannedCount,
        remaining,
        wouldBlock: plannedCount > actionLimit,
        loadProfile: {
          rps,
          burst,
          durationSeconds,
          projectedTotal,
          windowCapacity,
          wouldBlockByLoadProfile: projectedTotal > windowCapacity,
        },
      },
    });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'simulate failed' }, 500);
  }
};
