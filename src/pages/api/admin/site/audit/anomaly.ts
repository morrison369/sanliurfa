import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail } from '../../../../../lib/api';
import { query } from '../../../../../lib/postgres';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);
  try {
    const rows = await query<{ action: string; c: number }>(
      `
      SELECT action, COUNT(*)::int AS c
      FROM site_change_audit
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY action
      ORDER BY c DESC
      `,
    );
    const suspiciousIp = await query<{ c: number }>(
      `
      SELECT COUNT(*)::int AS c
      FROM (
        SELECT ip_address
        FROM site_change_audit
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY ip_address
        HAVING COUNT(*) > 50
      ) s
      `,
    );
    const total = rows.rows.reduce((sum, r) => sum + Number(r.c || 0), 0);
    const socialAbuse = rows.rows.find((r) => r.action === 'social_abuse');
    const socialAbuseRate = total > 0 ? Number(((Number(socialAbuse?.c || 0) / total) * 100).toFixed(2)) : 0;

    return json({
      success: true,
      data: {
        windowHours: 24,
        totalEvents: total,
        socialAbuseRate,
        suspiciousIpCount: Number(suspiciousIp.rows[0]?.c || 0),
        actionBreakdown: rows.rows,
      },
    });
  } catch (error) {
    return json({ success: false, error: safeErrorDetail(error, 'audit anomaly failed') }, 500);
  }
};
