import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { getSiteSetting } from '../../../../lib/site-content';
import { apiResponse, HttpStatus, problemJson, safeIntParam } from '../../../../lib/api';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

async function upsertSetting(
  key: string,
  value: Record<string, unknown>,
  description: string,
): Promise<void> {
  await query(
    `
      INSERT INTO site_settings (setting_key, setting_value, description, updated_at)
      VALUES ($1, $2::jsonb, $3, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description,
        updated_at = NOW()
    `,
    [key, JSON.stringify(value), description],
  );
}

export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-monitoring-ack-unauthorized',
      instance: '/api/admin/monitoring/ack',
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return problemJson({
      status: 400,
      title: 'Invalid JSON',
      detail: 'Geçerli JSON bekleniyor',
      type: '/problems/admin-monitoring-ack-invalid-json',
      instance: '/api/admin/monitoring/ack',
    });
  }

  const alarmKey = String(body?.alarmKey || '').trim();
  const mode = String(body?.mode || 'ack').trim();
  if (!alarmKey && mode !== 'maintenance') {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'alarmKey zorunlu',
      type: '/problems/admin-monitoring-ack-key-required',
      instance: '/api/admin/monitoring/ack',
    });
  }

  const current = await getSiteSetting<{ alarms: Record<string, { at: string; userId: string | null; email: string | null }> }>(
    'jobs.monitoring.alarms.ack',
    { alarms: {} },
  );
  current.alarms ||= {};
  const actor = {
    at: new Date().toISOString(),
    userId: locals?.user?.id ? String(locals.user.id) : null,
    email: locals?.user?.email ? String(locals.user.email) : null,
  };

  if (mode === 'ack') {
    current.alarms[alarmKey] = actor;
    await upsertSetting(
      'jobs.monitoring.alarms.ack',
      current as Record<string, unknown>,
      'Monitoring alarm acknowledge kayıtları',
    );
    return apiResponse({ success: true, alarmKey, mode }, HttpStatus.OK);
  }

  const control = await getSiteSetting<{
    maintenanceUntil: string | null;
    snooze: Record<string, string>;
  }>('jobs.monitoring.alarms.control', { maintenanceUntil: null, snooze: {} });
  control.snooze ||= {};
  if (mode === 'snooze') {
    const snoozeMinutes = safeIntParam(body?.snoozeMinutes, 30, 1, 1440);
    control.snooze[alarmKey] = new Date(Date.now() + snoozeMinutes * 60_000).toISOString();
  } else if (mode === 'maintenance') {
    const maintenanceMinutes = safeIntParam(body?.maintenanceMinutes, 60, 1, 1440);
    control.maintenanceUntil = new Date(Date.now() + maintenanceMinutes * 60_000).toISOString();
  } else if (mode === 'clear') {
    if (alarmKey) delete control.snooze[alarmKey];
    if (body?.clearMaintenance === true) control.maintenanceUntil = null;
  }

  await upsertSetting(
    'jobs.monitoring.alarms.control',
    control as Record<string, unknown>,
    'Monitoring alarm maintenance/snooze kontrolü',
  );

  return apiResponse({ success: true, alarmKey: alarmKey || null, mode }, HttpStatus.OK);
};
