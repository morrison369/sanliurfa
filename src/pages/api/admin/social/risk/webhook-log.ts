import type { APIRoute } from 'astro';
import { query } from '../../../../../lib/postgres';
import { getSiteSetting } from '../../../../../lib/site-content';
import { problemJson, safeErrorDetail, safeIntParam } from '../../../../../lib/api';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-social-risk-webhook-log-unauthorized',
      instance: '/api/admin/social/risk/webhook-log',
    });
  }

  const webhook = await getSiteSetting('social.risk.webhook', {
    enabled: false,
    eventName: 'admin.social_risk.alert',
    userId: '',
    cooldownMinutes: 30,
  });
  const eventName = String(webhook.eventName || 'admin.social_risk.alert');
  const limit = safeIntParam(url.searchParams.get('limit'), 30, 1, 200);

  try {
    const result = await query(
      `SELECT
         id,
         event,
         response_status,
         error,
         retry_count,
         COALESCE(delivered_at, created_at) AS delivered_at
       FROM webhook_deliveries
       WHERE event = $1
       ORDER BY COALESCE(delivered_at, created_at) DESC
       LIMIT $2`,
      [eventName, limit],
    );

    return new Response(
      JSON.stringify({
        success: true,
        eventName,
        items: result.rows,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Webhook Log Alınamadı',
      detail: safeErrorDetail(error, 'admin_social_risk_webhook_log_failed'),
      type: '/problems/admin-social-risk-webhook-log-failed',
      instance: '/api/admin/social/risk/webhook-log',
    });
  }
};
