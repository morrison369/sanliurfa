import type { APIRoute } from 'astro';
import { authenticateUser } from '../../../../../lib/auth/middleware';
import { query } from '../../../../../lib/postgres';
import { problemJson, safeErrorDetail } from '../../../../../lib/api';
import { getPendingSlaHours } from '../../../../../lib/place/lifecycle-events';
import { getSiteSetting } from '../../../../../lib/site-content';

type SlaTargets = {
  defaultHours: number;
  byDistrict: Record<string, number>;
  byTeam: Record<string, number>;
};

type SlaActionBody = {
  placeId: string;
  action: 'ack' | 'escalate' | 'label_breach';
  note?: string;
};

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-places-lifecycle-sla-unauthorized',
        instance: '/api/admin/places/lifecycle/sla',
      });
    }

    const fallbackHours = getPendingSlaHours();
    const targets = await getSiteSetting<SlaTargets>('places.lifecycle.sla.targets', {
      defaultHours: fallbackHours,
      byDistrict: {},
      byTeam: {},
    });
    const defaultHours = Number(targets.defaultHours || fallbackHours);
    const summaryResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'needs_info')::int AS needs_info_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_breached_count
       FROM places
       WHERE owner_id IS NOT NULL`,
    );

    const breachedResult = await query(
      `SELECT
         p.id,
         p.name,
         p.status,
         p.owner_id,
         p.created_at,
         p.updated_at,
         COALESCE(p.district_id::text, '') AS district_id,
         COALESCE(u.role, 'user') AS owner_role
       FROM places
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.status = 'pending'
       ORDER BY p.created_at ASC
       LIMIT 500`,
    );

    const breached: Array<Record<string, unknown>> = [];
    const byDistrict: Record<string, { total: number; breached: number; targetHours: number }> = {};
    const byTeam: Record<string, { total: number; breached: number; targetHours: number }> = {};
    for (const row of breachedResult.rows) {
      const districtId = String(row.district_id || 'unknown');
      const team = String(row.owner_role || 'user');
      const districtTarget = Number(targets.byDistrict?.[districtId] || defaultHours);
      const teamTarget = Number(targets.byTeam?.[team] || defaultHours);
      const targetHours = Math.max(1, Math.min(districtTarget, teamTarget, 720));
      const ageHours =
        (Date.now() - new Date(String(row.created_at)).getTime()) / (1000 * 60 * 60);
      const isBreached = ageHours >= targetHours;

      byDistrict[districtId] ||= { total: 0, breached: 0, targetHours };
      byDistrict[districtId].total += 1;
      byDistrict[districtId].breached += isBreached ? 1 : 0;

      byTeam[team] ||= { total: 0, breached: 0, targetHours };
      byTeam[team].total += 1;
      byTeam[team].breached += isBreached ? 1 : 0;

      if (isBreached) {
        const suggestion =
          ageHours >= targetHours * 3
            ? 'escalate'
            : ageHours >= targetHours * 1.5
              ? 'label_breach'
              : 'ack';
        breached.push({
          ...row,
          targetHours,
          ageHours: Number(ageHours.toFixed(2)),
          suggestedAction: suggestion,
          suggestedActions: ['ack', 'label_breach', 'escalate'],
        });
      }
    }

    const summary = summaryResult.rows[0] || {
      pending_count: 0,
      needs_info_count: 0,
      pending_breached_count: 0,
    };
    summary.pending_breached_count = breached.length;

    return new Response(
      JSON.stringify({
        success: true,
        slaHours: defaultHours,
        summary,
        segmented: {
          byDistrict,
          byTeam,
        },
        breached,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Mekan Lifecycle SLA Alınamadı',
      detail: safeErrorDetail(error, 'admin_places_lifecycle_sla_failed'),
      type: '/problems/admin-places-lifecycle-sla-failed',
      instance: '/api/admin/places/lifecycle/sla',
    });
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-places-lifecycle-sla-action-unauthorized',
        instance: '/api/admin/places/lifecycle/sla',
      });
    }

    const body = (await context.request.json()) as SlaActionBody;
    const placeId = String(body?.placeId || '').trim();
    const action = String(body?.action || '').trim();
    const note = String(body?.note || '').trim();
    if (!placeId || !['ack', 'escalate', 'label_breach'].includes(action)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Parametre',
        detail: 'placeId ve geçerli action zorunludur',
        type: '/problems/admin-places-lifecycle-sla-action-invalid',
        instance: '/api/admin/places/lifecycle/sla',
      });
    }

    await query(
      `INSERT INTO place_sla_alert_state (place_id, last_alert_at, updated_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (place_id)
       DO UPDATE SET last_alert_at = NOW(), updated_at = NOW()`,
      [placeId],
    );

    await query(
      `INSERT INTO place_lifecycle_events (
        place_id, from_status, to_status, actor_user_id, reason, metadata, created_at
      )
      SELECT
        p.id,
        p.status,
        p.status,
        $2,
        $3,
        $4::jsonb,
        NOW()
      FROM places p
      WHERE p.id = $1`,
      [
        placeId,
        auth.user.id,
        `sla_${action}`,
        JSON.stringify({
          type: 'sla_action',
          action,
          note,
          actedAt: new Date().toISOString(),
        }),
      ],
    );

    return new Response(
      JSON.stringify({
        success: true,
        placeId,
        action,
        note,
        message: 'SLA aksiyonu kaydedildi',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'SLA Aksiyonu Kaydedilemedi',
      detail: safeErrorDetail(error, 'admin_places_lifecycle_sla_action_failed'),
      type: '/problems/admin-places-lifecycle-sla-action-failed',
      instance: '/api/admin/places/lifecycle/sla',
    });
  }
};
