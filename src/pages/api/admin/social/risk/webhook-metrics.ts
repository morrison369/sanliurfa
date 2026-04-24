import type { APIRoute } from 'astro';
import { query } from '../../../../../lib/postgres';
import { getSiteSetting } from '../../../../../lib/site-content';
import { problemJson } from '../../../../../lib/api';

function isAdmin(locals: any) {
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-social-risk-webhook-metrics-unauthorized',
      instance: '/api/admin/social/risk/webhook-metrics',
    });
  }

  const webhook = await getSiteSetting('social.risk.webhook', {
    enabled: false,
    eventName: 'admin.social_risk.alert',
    userId: '',
    cooldownMinutes: 30,
  });
  const eventName = String(webhook.eventName || 'admin.social_risk.alert');

  try {
    const [summary, retryBuckets, failureClasses, latency] = await Promise.all([
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300)::int AS success_count,
           COUNT(*) FILTER (WHERE response_status IS NULL OR response_status >= 400)::int AS failure_count
         FROM webhook_deliveries
         WHERE event = $1`,
        [eventName],
      ),
      query(
        `SELECT retry_count, COUNT(*)::int AS count
         FROM webhook_deliveries
         WHERE event = $1
         GROUP BY retry_count
         ORDER BY retry_count ASC`,
        [eventName],
      ),
      query(
        `SELECT
           CASE
             WHEN LOWER(COALESCE(error, '')) LIKE '%timeout%' THEN 'timeout'
             WHEN LOWER(COALESCE(error, '')) LIKE '%network%' THEN 'network'
             WHEN LOWER(COALESCE(error, '')) LIKE '%dns%' THEN 'dns'
             WHEN response_status >= 500 THEN 'http_5xx'
             WHEN response_status >= 400 THEN 'http_4xx'
             WHEN COALESCE(error, '') <> '' THEN 'other_error'
             ELSE 'unknown'
           END AS failure_class,
           COUNT(*)::int AS count
         FROM webhook_deliveries
         WHERE event = $1
           AND (response_status IS NULL OR response_status >= 400 OR COALESCE(error, '') <> '')
         GROUP BY failure_class
         ORDER BY count DESC`,
        [eventName],
      ),
      query(
        `SELECT
           percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms)::float AS p50_ms,
           percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms)::float AS p95_ms
         FROM (
           SELECT EXTRACT(EPOCH FROM (COALESCE(delivered_at, created_at) - created_at)) * 1000 AS latency_ms
           FROM webhook_deliveries
           WHERE event = $1
         ) t`,
        [eventName],
      ),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        eventName,
        summary: summary.rows[0] || { total: 0, success_count: 0, failure_count: 0 },
        latency: latency.rows[0] || { p50_ms: null, p95_ms: null },
        retryBuckets: retryBuckets.rows,
        failureClasses: failureClasses.rows,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Webhook Metrikleri Alınamadı',
      detail: error instanceof Error ? error.message : 'admin_social_risk_webhook_metrics_failed',
      type: '/problems/admin-social-risk-webhook-metrics-failed',
      instance: '/api/admin/social/risk/webhook-metrics',
    });
  }
};
