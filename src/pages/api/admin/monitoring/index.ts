import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../../lib/postgres';
import { getSiteSetting } from '../../../../lib/site-content';
import { problemJson } from '../../../../lib/api';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

async function safeRows(sql: string, params: unknown[] = []) {
  try {
    const result = await query(sql, params);
    return result.rows || [];
  } catch {
    return [];
  }
}

async function safeRow<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  try {
    return (await queryOne<T>(sql, params)) || null;
  } catch {
    return null;
  }
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

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/monitoring',
    });
  }

  const [
    dbSizeRow,
    errorStats,
    requestStats,
    recentErrors,
    transportRow,
    weatherRow,
    reviewStatusRows,
    p95Row,
    errorRatioRow,
    cacheHitRatioRow,
    messageDriftRow,
    reviewFlaggedRow,
    socialRetentionJobRow,
    placesSlaAlertJobRow,
    socialLifecycleReportJobRow,
    socialArchivePartitionsJobRow,
    socialArchivePartitionsDailyJobRow,
  ] =
    await Promise.all([
      queryOne<{ db_size: string }>(
        `SELECT pg_size_pretty(pg_database_size(current_database())) as db_size`,
      ).catch(() => ({ db_size: '-' } as { db_size: string })),
      safeRows(
        `SELECT level, COUNT(*)::int as count
         FROM system_logs
         WHERE created_at >= NOW() - INTERVAL '24 hours'
         GROUP BY level
         ORDER BY count DESC`,
      ),
      safeRows(
        `SELECT method, COUNT(*)::int as count, AVG(duration_ms)::float as avg_duration
         FROM request_logs
         WHERE created_at >= NOW() - INTERVAL '24 hours'
         GROUP BY method
         ORDER BY count DESC`,
      ),
      safeRows(
        `SELECT level, message, created_at
         FROM system_logs
         WHERE level IN ('error', 'fatal')
         ORDER BY created_at DESC
         LIMIT 25`,
      ),
      queryOne<{ setting_value: Record<string, any> }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'transport.lastUpdated' LIMIT 1`,
      ).catch(() => null),
      queryOne<{ setting_value: Record<string, any> }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'weather.lastUpdated' LIMIT 1`,
      ).catch(() => null),
      safeRows(
        `SELECT status, COUNT(*)::int as count
         FROM reviews
         GROUP BY status`,
      ),
      safeRow<{ p95: number }>(
        `SELECT percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms)::float as p95
         FROM request_logs
         WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ),
      safeRow<{ total: number; errors: number }>(
        `SELECT
           COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE status_code >= 500)::int as errors
         FROM request_logs
         WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ),
      safeRow<{ total: number; hits: number }>(
        `SELECT
           COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE cache_hit = true)::int as hits
         FROM request_logs
         WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ),
      safeRow<{ drift_count: number }>(
        `SELECT COUNT(*)::int as drift_count
         FROM (
           SELECT
             cp.user_id,
             cp.conversation_id,
             SUM(
               CASE
                 WHEN m.sender_id <> cp.user_id
                  AND m.created_at > COALESCE(cp.last_read_at, TIMESTAMP '1970-01-01')
                 THEN 1 ELSE 0
               END
             )::int as expected_unread,
             SUM(
               CASE
                 WHEN m.sender_id <> cp.user_id AND m.is_read = false
                 THEN 1 ELSE 0
               END
             )::int as actual_unread
           FROM conversation_participants cp
           LEFT JOIN messages m ON m.conversation_id = cp.conversation_id
           GROUP BY cp.user_id, cp.conversation_id
           HAVING
             SUM(
               CASE
                 WHEN m.sender_id <> cp.user_id
                  AND m.created_at > COALESCE(cp.last_read_at, TIMESTAMP '1970-01-01')
                 THEN 1 ELSE 0
               END
             )::int <>
             SUM(
               CASE
                 WHEN m.sender_id <> cp.user_id AND m.is_read = false
                 THEN 1 ELSE 0
               END
             )::int
         ) drift`,
      ),
      safeRow<{ flagged_count: number }>(
        `SELECT COUNT(*)::int as flagged_count
         FROM site_change_audit
         WHERE action = 'social_abuse'
           AND setting_key = 'reviews.antiSpam'
           AND metadata->>'reason' IN ('review_hard_blocked', 'review_auto_moderated')
           AND created_at >= NOW() - INTERVAL '24 hours'`,
      ),
      queryOne<{ setting_value: Record<string, any> }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'jobs.socialRetention.lastRun' LIMIT 1`,
      ).catch(() => null),
      queryOne<{ setting_value: Record<string, any> }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'jobs.placesSlaAlert.lastRun' LIMIT 1`,
      ).catch(() => null),
      queryOne<{ setting_value: Record<string, any> }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'jobs.socialLifecycleReport.lastRun' LIMIT 1`,
      ).catch(() => null),
      queryOne<{ setting_value: Record<string, any> }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'jobs.socialArchivePartitions.lastRun' LIMIT 1`,
      ).catch(() => null),
      queryOne<{ setting_value: Record<string, any> }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'jobs.socialArchivePartitions.daily.lastRun' LIMIT 1`,
      ).catch(() => null),
    ]);

  const reviewAntiSpam = await getSiteSetting('reviews.antiSpam', {
    enabled: true,
    autoModerateThreshold: 55,
    hardBlockThreshold: 85,
    minLength: 20,
    repeatedCharLimit: 6,
    suspiciousKeywords: [],
  });

  const reviewsByStatus = Object.fromEntries(
    reviewStatusRows.map((x) => [String(x.status || 'unknown'), Number(x.count || 0)]),
  );
  const alarmAck = await getSiteSetting<{
    alarms: Record<
      string,
      { at: string; userId: string | null; email: string | null; resolvedAt?: string | null }
    >;
  }>('jobs.monitoring.alarms.ack', { alarms: {} });
  alarmAck.alarms ||= {};
  const alarmControl = await getSiteSetting<{
    maintenanceUntil: string | null;
    snooze: Record<string, string>;
  }>('jobs.monitoring.alarms.control', { maintenanceUntil: null, snooze: {} });
  alarmControl.snooze ||= {};

  const cronItems = [
    { key: 'socialRetention', data: socialRetentionJobRow?.setting_value || null },
    { key: 'placesSlaAlert', data: placesSlaAlertJobRow?.setting_value || null },
    { key: 'socialLifecycleReport', data: socialLifecycleReportJobRow?.setting_value || null },
    { key: 'socialArchivePartitions', data: socialArchivePartitionsJobRow?.setting_value || null },
    {
      key: 'socialArchivePartitionsDaily',
      data: socialArchivePartitionsDailyJobRow?.setting_value || null,
    },
  ].map((item) => {
    const data = item.data || {};
    const updatedAt = data.at || data.generatedAt || data.finishedAt || null;
    const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : null;
    const stale = typeof ageMs === 'number' ? ageMs > 36 * 60 * 60 * 1000 : true;
    const success = Boolean(data.success);
    const severity = !success ? 'red' : stale ? 'yellow' : 'green';
    return {
      key: item.key,
      success,
      stale,
      severity,
      updatedAt,
      ageHours: typeof ageMs === 'number' ? Number((ageMs / (1000 * 60 * 60)).toFixed(2)) : null,
    };
  });
  const cronFailureCount = cronItems.filter((x) => x.severity === 'red').length;
  const cronStaleCount = cronItems.filter((x) => x.stale).length;
  const now = Date.now();
  const maintenanceActive = Boolean(
    alarmControl.maintenanceUntil && new Date(alarmControl.maintenanceUntil).getTime() > now,
  );
  const isSnoozed = (key: string) =>
    Boolean(alarmControl.snooze[key] && new Date(alarmControl.snooze[key]).getTime() > now);
  const autoResolveCandidates: Array<{ key: string; healthy: boolean }> = [
    { key: 'unreadDriftConversations', healthy: Number(messageDriftRow?.drift_count || 0) <= 0 },
    { key: 'reviewFlaggedLast24h', healthy: Number(reviewFlaggedRow?.flagged_count || 0) <= 10 },
    { key: 'cronFailureCount', healthy: cronFailureCount <= 0 },
    { key: 'cronStaleCount', healthy: cronStaleCount <= 2 },
  ];
  let ackChanged = false;
  for (const candidate of autoResolveCandidates) {
    const ackRow = alarmAck.alarms[candidate.key];
    if (!ackRow || ackRow.resolvedAt) continue;
    if (candidate.healthy) {
      ackRow.resolvedAt = new Date().toISOString();
      ackChanged = true;
    }
  }
  if (ackChanged) {
    await upsertSetting(
      'jobs.monitoring.alarms.ack',
      alarmAck as Record<string, unknown>,
      'Monitoring alarm acknowledge kayıtları',
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const cronHistoryState = await getSiteSetting<{
    days: Array<{ date: string; green: number; yellow: number; red: number }>;
  }>('jobs.monitoring.cronHealth.history', { days: [] });
  const nextDays = (cronHistoryState.days || []).filter((x) => x.date !== today);
  nextDays.push({
    date: today,
    green: cronItems.filter((x) => x.severity === 'green').length,
    yellow: cronItems.filter((x) => x.severity === 'yellow').length,
    red: cronItems.filter((x) => x.severity === 'red').length,
  });
  nextDays.sort((a, b) => a.date.localeCompare(b.date));
  const trimmedDays = nextDays.slice(-7);
  await upsertSetting(
    'jobs.monitoring.cronHealth.history',
    { days: trimmedDays },
    'Monitoring cron health son 7 gün trend',
  );

  return new Response(
    JSON.stringify({
      success: true,
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        memory: {
          used: Math.round(process.memoryUsage().rss / 1024 / 1024),
          total: Math.round((process.memoryUsage().heapTotal + process.memoryUsage().external) / 1024 / 1024),
        },
      },
      database: {
        db_size: dbSizeRow?.db_size || '-',
      },
      errors: errorStats,
      requests: requestStats,
      recentErrors,
      upstreamHealth: {
        transport: transportRow?.setting_value || null,
        weather: weatherRow?.setting_value || null,
      },
      jobs: {
        socialRetention: socialRetentionJobRow?.setting_value || null,
        placesSlaAlert: placesSlaAlertJobRow?.setting_value || null,
        socialLifecycleReport: socialLifecycleReportJobRow?.setting_value || null,
        socialArchivePartitions: socialArchivePartitionsJobRow?.setting_value || null,
        socialArchivePartitionsDaily: socialArchivePartitionsDailyJobRow?.setting_value || null,
      },
      reviews: {
        statusCounts: reviewsByStatus,
        antiSpam: reviewAntiSpam,
      },
      slo: {
        apiP95Ms: Number(p95Row?.p95 || 0),
        errorRatio: errorRatioRow?.total
          ? Number((Number(errorRatioRow.errors || 0) / Number(errorRatioRow.total || 1)).toFixed(4))
          : 0,
        cacheHitRatio: cacheHitRatioRow?.total
          ? Number((Number(cacheHitRatioRow.hits || 0) / Number(cacheHitRatioRow.total || 1)).toFixed(4))
          : null,
      },
      alarms: {
        unreadDriftConversations: Number(messageDriftRow?.drift_count || 0),
        reviewFlaggedLast24h: Number(reviewFlaggedRow?.flagged_count || 0),
        cronFailureCount,
        cronStaleCount,
        acknowledged: {
          unreadDrift: alarmAck.alarms.unreadDriftConversations || null,
          reviewFlagged: alarmAck.alarms.reviewFlaggedLast24h || null,
          cronFailure: alarmAck.alarms.cronFailureCount || null,
          cronStale: alarmAck.alarms.cronStaleCount || null,
        },
        suppressed: {
          maintenanceActive,
          maintenanceUntil: alarmControl.maintenanceUntil || null,
          unreadDriftConversations: maintenanceActive || isSnoozed('unreadDriftConversations'),
          reviewFlaggedLast24h: maintenanceActive || isSnoozed('reviewFlaggedLast24h'),
          cronFailureCount: maintenanceActive || isSnoozed('cronFailureCount'),
          cronStaleCount: maintenanceActive || isSnoozed('cronStaleCount'),
        },
      },
      cronHealth: {
        items: cronItems,
        history: trimmedDays,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  );
};
