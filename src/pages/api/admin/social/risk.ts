import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { problemJson } from '../../../../lib/api';
import { getSiteSetting } from '../../../../lib/site-content';
import { triggerWebhook } from '../../../../lib/webhooks/index';

function isAdmin(locals: any) {
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

type SocialRiskThresholds = {
  scoreAlert: number;
  zScoreAlert: number;
  minLastHour: number;
  minTotal: number;
  byTenant?: Record<
    string,
    {
      scoreAlert?: number;
      zScoreAlert?: number;
      minLastHour?: number;
      minTotal?: number;
    }
  >;
};

type SocialRiskWebhook = {
  enabled: boolean;
  eventName: string;
  userId?: string;
  cooldownMinutes: number;
};

type SocialRiskAutoActions = {
  enabled: boolean;
  cooldownMinutes: number;
  note: string;
  rollbackToDefaultWhenHealthy: boolean;
  profile: {
    swipeLimit: number;
    swipeWindowSeconds: number;
    followLimit: number;
    followWindowSeconds: number;
    messageWriteLimit: number;
    messageWriteWindowSeconds: number;
  };
};

type SocialRiskDispatchState = {
  tenants: Record<string, string>;
};

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

export const GET: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-social-risk-unauthorized',
      instance: '/api/admin/social/risk',
    });
  }

  try {
    const url = new URL(request.url);
    const hoursRaw = Number(url.searchParams.get('hours') || 24);
    const hours = Number.isFinite(hoursRaw) ? Math.max(6, Math.min(168, hoursRaw)) : 24;
    const thresholds = await getSiteSetting<SocialRiskThresholds>('social.risk.thresholds', {
      scoreAlert: 70,
      zScoreAlert: 2.0,
      minLastHour: 2,
      minTotal: 5,
      byTenant: {},
    });
    const webhook = await getSiteSetting<SocialRiskWebhook>('social.risk.webhook', {
      enabled: false,
      eventName: 'admin.social_risk.alert',
      userId: '',
      cooldownMinutes: 30,
    });
    const autoActions = await getSiteSetting<SocialRiskAutoActions>('social.risk.autoActions', {
      enabled: false,
      cooldownMinutes: 60,
      note: 'social_risk_auto_action',
      rollbackToDefaultWhenHealthy: true,
      profile: {
        swipeLimit: 60,
        swipeWindowSeconds: 60,
        followLimit: 30,
        followWindowSeconds: 60,
        messageWriteLimit: 40,
        messageWriteWindowSeconds: 60,
      },
    });
    const dispatchState = await getSiteSetting<SocialRiskDispatchState>(
      'jobs.socialRiskAlert.lastDispatch',
      { tenants: {} },
    );
    if (!dispatchState.tenants || typeof dispatchState.tenants !== 'object') {
      dispatchState.tenants = {};
    }

    const rows = await query(
      `SELECT
         DATE_TRUNC('hour', created_at) AS hour_bucket,
         COALESCE(metadata->>'tenantId', 'default') AS tenant_id,
         COUNT(*)::int AS count
       FROM site_change_audit
       WHERE action = 'social_abuse'
         AND created_at >= NOW() - ($1::text || ' hours')::interval
       GROUP BY hour_bucket, tenant_id
       ORDER BY hour_bucket ASC`,
      [String(hours)],
    );

    const reasons = await query(
      `SELECT
         COALESCE(metadata->>'tenantId', 'default') AS tenant_id,
         COALESCE(metadata->>'reason', 'unknown') AS reason,
         COUNT(*)::int AS count
       FROM site_change_audit
       WHERE action = 'social_abuse'
         AND created_at >= NOW() - ($1::text || ' hours')::interval
       GROUP BY tenant_id, reason
       ORDER BY count DESC`,
      [String(hours)],
    );

    const trendByTenant = new Map<string, Array<{ hour: string; count: number }>>();
    for (const row of rows.rows) {
      const tenant = String(row.tenant_id || 'default');
      const arr = trendByTenant.get(tenant) || [];
      arr.push({
        hour: new Date(row.hour_bucket).toISOString(),
        count: Number(row.count || 0),
      });
      trendByTenant.set(tenant, arr);
    }

    const reasonsByTenant = new Map<string, Array<{ reason: string; count: number }>>();
    for (const row of reasons.rows) {
      const tenant = String(row.tenant_id || 'default');
      const arr = reasonsByTenant.get(tenant) || [];
      arr.push({ reason: String(row.reason || 'unknown'), count: Number(row.count || 0) });
      reasonsByTenant.set(tenant, arr);
    }

    const tenants = Array.from(new Set([...trendByTenant.keys(), ...reasonsByTenant.keys()]));
    const risk = tenants.map((tenantId) => {
      const points = trendByTenant.get(tenantId) || [];
      const counts = points.map((x) => x.count);
      const lastHour = counts[counts.length - 1] || 0;
      const baseline = counts.slice(0, -1);
      const avg = mean(baseline);
      const sd = stdev(baseline);
      const zScore = sd > 0 ? (lastHour - avg) / sd : 0;
      const anomaly = counts.length >= 4 && lastHour > 0 && zScore >= 2;
      const total = counts.reduce((a, b) => a + b, 0);
      const score = Math.max(
        0,
        Math.min(100, Math.round(total * 2 + Math.max(0, zScore) * 10 + (anomaly ? 20 : 0))),
      );
      const tenantThreshold = thresholds.byTenant?.[tenantId] || {};
      const scoreLimit = Number(tenantThreshold.scoreAlert ?? thresholds.scoreAlert ?? 70);
      const zScoreLimit = Number(tenantThreshold.zScoreAlert ?? thresholds.zScoreAlert ?? 2);
      const minLastHourLimit = Number(tenantThreshold.minLastHour ?? thresholds.minLastHour ?? 1);
      const minTotalLimit = Number(tenantThreshold.minTotal ?? thresholds.minTotal ?? 1);
      const scoreAlarm = score >= scoreLimit;
      const zScoreAlarm = zScore >= zScoreLimit;
      const volumeEnough =
        lastHour >= minLastHourLimit &&
        total >= minTotalLimit;
      const shouldAlert = volumeEnough && (anomaly || scoreAlarm || zScoreAlarm);

      return {
        tenantId,
        score,
        anomaly,
        lastHour,
        avg: Number(avg.toFixed(2)),
        stdev: Number(sd.toFixed(2)),
        zScore: Number(zScore.toFixed(2)),
        total,
        shouldAlert,
        scoreAlarm,
        zScoreAlarm,
        effectiveThresholds: {
          scoreAlert: scoreLimit,
          zScoreAlert: zScoreLimit,
          minLastHour: minLastHourLimit,
          minTotal: minTotalLimit,
        },
        trend: points,
        reasons: reasonsByTenant.get(tenantId) || [],
      };
    });

    const sortedRisk = risk.sort((a, b) => b.score - a.score);
    const alertCandidates = sortedRisk.filter((x) => x.shouldAlert);
    const alertedTenantIds: string[] = [];
    const autoActionTenantIds: string[] = [];

    if (webhook.enabled && alertCandidates.length > 0) {
      const now = Date.now();
      const cooldownMs = Math.max(
        60_000,
        Math.min(24 * 60 * 60 * 1000, Number(webhook.cooldownMinutes || 30) * 60_000),
      );
      for (const item of alertCandidates) {
        const lastDispatchedIso = dispatchState.tenants?.[item.tenantId];
        const lastDispatchedAt = lastDispatchedIso ? new Date(lastDispatchedIso).getTime() : 0;
        if (lastDispatchedAt && now - lastDispatchedAt < cooldownMs) {
          continue;
        }

        await triggerWebhook(
          webhook.eventName || 'admin.social_risk.alert',
          {
            tenantId: item.tenantId,
            score: item.score,
            anomaly: item.anomaly,
            zScore: item.zScore,
            lastHour: item.lastHour,
            total: item.total,
            reasons: item.reasons,
            effectiveThresholds: item.effectiveThresholds,
            generatedAt: new Date().toISOString(),
            windowHours: hours,
          },
          webhook.userId ? String(webhook.userId) : undefined,
        );
        alertedTenantIds.push(item.tenantId);
        dispatchState.tenants[item.tenantId] = new Date(now).toISOString();
      }

      if (alertedTenantIds.length > 0) {
        await upsertSetting(
          'jobs.socialRiskAlert.lastDispatch',
          dispatchState as Record<string, unknown>,
          'Social risk webhook alarm son gönderim kayıtları',
        );
      }
    }

    if (autoActions.enabled && alertCandidates.length > 0) {
      const now = Date.now();
      const cooldownMs = Math.max(
        60_000,
        Math.min(24 * 60 * 60 * 1000, Number(autoActions.cooldownMinutes || 60) * 60_000),
      );
      for (const item of alertCandidates) {
        const lastActionIso = dispatchState.tenants?.[`auto:${item.tenantId}`];
        const lastActionAt = lastActionIso ? new Date(lastActionIso).getTime() : 0;
        if (lastActionAt && now - lastActionAt < cooldownMs) continue;
        await query(
          `INSERT INTO tenant_social_policies (
             tenant_id,
             swipe_limit, swipe_window_seconds,
             follow_limit, follow_window_seconds,
             message_write_limit, message_write_window_seconds,
             is_active, note, updated_by, updated_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,NULL,NOW())
           ON CONFLICT (tenant_id)
           DO UPDATE SET
             swipe_limit = EXCLUDED.swipe_limit,
             swipe_window_seconds = EXCLUDED.swipe_window_seconds,
             follow_limit = EXCLUDED.follow_limit,
             follow_window_seconds = EXCLUDED.follow_window_seconds,
             message_write_limit = EXCLUDED.message_write_limit,
             message_write_window_seconds = EXCLUDED.message_write_window_seconds,
             is_active = true,
             note = EXCLUDED.note,
             updated_at = NOW()`,
          [
            item.tenantId,
            Number(autoActions.profile.swipeLimit || 60),
            Number(autoActions.profile.swipeWindowSeconds || 60),
            Number(autoActions.profile.followLimit || 30),
            Number(autoActions.profile.followWindowSeconds || 60),
            Number(autoActions.profile.messageWriteLimit || 40),
            Number(autoActions.profile.messageWriteWindowSeconds || 60),
            `${String(autoActions.note || 'social_risk_auto_action')} @ ${new Date(now).toISOString()}`,
          ],
        );
        autoActionTenantIds.push(item.tenantId);
        dispatchState.tenants[`auto:${item.tenantId}`] = new Date(now).toISOString();
      }
      if (autoActionTenantIds.length > 0) {
        await upsertSetting(
          'jobs.socialRiskAlert.lastDispatch',
          dispatchState as Record<string, unknown>,
          'Social risk webhook alarm son gönderim kayıtları',
        );
      }
    }
    let autoRollbackCount = 0;
    if (autoActions.enabled && autoActions.rollbackToDefaultWhenHealthy) {
      const alertTenantSet = new Set(alertCandidates.map((x) => x.tenantId));
      const autoPolicyRows = await query(
        `SELECT tenant_id
         FROM tenant_social_policies
         WHERE is_active = true
           AND note ILIKE $1`,
        [`${String(autoActions.note || 'social_risk_auto_action')}%`],
      );
      const toRollback = autoPolicyRows.rows
        .map((x: any) => String(x.tenant_id))
        .filter((tenantId: string) => !alertTenantSet.has(tenantId));
      if (toRollback.length > 0) {
        await query(
          `UPDATE tenant_social_policies
           SET is_active = false,
               note = CONCAT(COALESCE(note, ''), ' | auto_rollback ', NOW()::text),
               updated_at = NOW()
           WHERE tenant_id = ANY($1)`,
          [toRollback],
        );
        autoRollbackCount = toRollback.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        windowHours: hours,
        generatedAt: new Date().toISOString(),
        thresholds,
        webhook: {
          enabled: webhook.enabled,
          eventName: webhook.eventName,
          cooldownMinutes: webhook.cooldownMinutes,
        },
        autoActions: {
          enabled: autoActions.enabled,
          cooldownMinutes: autoActions.cooldownMinutes,
          appliedTenantIds: autoActionTenantIds,
          rollbackCount: autoRollbackCount,
        },
        alertedTenantIds,
        tenants: sortedRisk,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Social Risk Dashboard Alınamadı',
      detail: error instanceof Error ? error.message : 'admin_social_risk_failed',
      type: '/problems/admin-social-risk-failed',
      instance: '/api/admin/social/risk',
    });
  }
};
