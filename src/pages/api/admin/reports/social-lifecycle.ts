import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../../lib/postgres';
import { problemJson } from '../../../../lib/api';
import { consumeExportToken } from '../../../../lib/admin/export-tokens';
import { renderPdfFromHtml } from '../../../../lib/admin/pdf-render';
import { sendEmail } from '../../../../lib/email';
import { auditSiteChange } from '../../../../lib/site-content';

function isAdmin(locals: any) {
  if (process.env.E2E_ADMIN_BYPASS === '1') return true;
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

function renderHtmlReport(payload: any): string {
  const socialRows = (payload?.social?.eventsByType || [])
    .map((x: any) => `<tr><td>${x.event_type}</td><td>${x.count}</td></tr>`)
    .join('');
  const socialTrendRows = (payload?.social?.hourlyTrend || [])
    .map((x: any) => `<tr><td>${x.hour_bucket}</td><td>${x.count}</td></tr>`)
    .join('');
  const socialTenantRows = (payload?.social?.topTenants || [])
    .map((x: any) => `<tr><td>${x.tenant_id}</td><td>${x.count}</td></tr>`)
    .join('');
  const lifecycleRows = (payload?.lifecycle?.transitionsByStatus || [])
    .map((x: any) => `<tr><td>${x.to_status}</td><td>${x.count}</td></tr>`)
    .join('');
  return `<!doctype html>
  <html lang="tr">
  <head><meta charset="utf-8"><title>Social Lifecycle Rapor</title></head>
  <body style="font-family:Arial,sans-serif;padding:16px">
    <h1>Social + Lifecycle Raporu</h1>
    <p>Pencere: <strong>${payload.windowHours}</strong> saat</p>
    <p>Üretim: ${payload.generatedAt}</p>
    <h2>Sosyal Olaylar</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Event</th><th>Count</th></tr>
      ${socialRows || '<tr><td colspan="2">Veri yok</td></tr>'}
    </table>
    <h2>Sosyal Saatlik Trend</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Saat</th><th>Count</th></tr>
      ${socialTrendRows || '<tr><td colspan="2">Veri yok</td></tr>'}
    </table>
    <h2>Sosyal Tenant Dağılımı</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Tenant</th><th>Count</th></tr>
      ${socialTenantRows || '<tr><td colspan="2">Veri yok</td></tr>'}
    </table>
    <h2>Lifecycle Geçişleri</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>To Status</th><th>Count</th></tr>
      ${lifecycleRows || '<tr><td colspan="2">Veri yok</td></tr>'}
    </table>
    <h2>SLA Snapshot</h2>
    <pre>${JSON.stringify(payload.lifecycle?.currentSlaSnapshot || {}, null, 2)}</pre>
  </body>
  </html>`;
}

export const GET: APIRoute = async ({ locals, request }) => {
  const url = new URL(request.url);
  const signedToken = String(url.searchParams.get('token') || '').trim();
  const admin = isAdmin(locals);
  if (!admin) {
    const consumed = await consumeExportToken({
      token: signedToken,
      resourceKey: 'admin.reports.social-lifecycle',
      requestIp:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        (locals as any)?.clientAddress ||
        null,
      userAgent: request.headers.get('user-agent') || null,
      requestCountry:
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('x-country-code') ||
        null,
    });
    if (!consumed.ok) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin veya geçerli report token gerekli',
        type: '/problems/admin-social-lifecycle-report-unauthorized',
        instance: '/api/admin/reports/social-lifecycle',
      });
    }
  }

  try {
    const hoursRaw = Number(url.searchParams.get('hours') || 24);
    const hours = Number.isFinite(hoursRaw) ? Math.max(1, Math.min(720, hoursRaw)) : 24;
    const format = String(url.searchParams.get('format') || 'json').toLowerCase();
    const shouldEmail = url.searchParams.get('email') === '1';
    const emailTo = String(url.searchParams.get('to') || process.env.ADMIN_EMAIL || '').trim();

    const [eventsByType, hourlyTrend, topTenants, lifecycleByStatus, slaSummary] = await Promise.all([
      query(
        `SELECT event_type, COUNT(*)::int AS count
         FROM social_event_store
         WHERE created_at >= NOW() - ($1::text || ' hours')::interval
         GROUP BY event_type
         ORDER BY count DESC`,
        [String(hours)],
      ),
      query(
        `SELECT
           DATE_TRUNC('hour', created_at)::text AS hour_bucket,
           COUNT(*)::int AS count
         FROM social_event_store
         WHERE created_at >= NOW() - ($1::text || ' hours')::interval
         GROUP BY hour_bucket
         ORDER BY hour_bucket ASC`,
        [String(hours)],
      ),
      query(
        `SELECT
           COALESCE(metadata->>'tenantId', 'default') AS tenant_id,
           COUNT(*)::int AS count
         FROM social_event_store
         WHERE created_at >= NOW() - ($1::text || ' hours')::interval
         GROUP BY tenant_id
         ORDER BY count DESC
         LIMIT 20`,
        [String(hours)],
      ),
      query(
        `SELECT to_status, COUNT(*)::int AS count
         FROM place_lifecycle_events
         WHERE created_at >= NOW() - ($1::text || ' hours')::interval
         GROUP BY to_status
         ORDER BY count DESC`,
        [String(hours)],
      ),
      queryOne(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
           COUNT(*) FILTER (WHERE status = 'needs_info')::int AS needs_info_count
         FROM places
         WHERE owner_id IS NOT NULL`,
      ),
    ]);

    const payload = {
      success: true,
      windowHours: hours,
      generatedAt: new Date().toISOString(),
      social: {
        eventsByType: eventsByType.rows,
        hourlyTrend: hourlyTrend.rows,
        topTenants: topTenants.rows,
      },
      lifecycle: {
        transitionsByStatus: lifecycleByStatus.rows,
        currentSlaSnapshot: slaSummary || { pending_count: 0, needs_info_count: 0 },
      },
    };

    const html = renderHtmlReport(payload);
    const pdf = await renderPdfFromHtml(html);

    if (shouldEmail && emailTo) {
      await sendEmail({
        to: emailTo,
        subject: `[Sanliurfa.com] Social Lifecycle Report (${payload.windowHours}h)`,
        html,
        attachments: [
          {
            filename: `social-lifecycle-${Date.now()}.html`,
            content: Buffer.from(html, 'utf8'),
          },
          {
            filename: `social-lifecycle-${Date.now()}.pdf`,
            content: pdf,
          },
        ],
      });
    }

    if (admin) {
      await auditSiteChange(
        'admin.reports.social-lifecycle',
        'publish',
        {
          userId: locals?.user?.id ? String(locals.user.id) : null,
          actorEmail: locals?.user?.email ? String(locals.user.email) : null,
        },
        {
          action: 'report_export',
          format,
          hours,
          emailed: shouldEmail && Boolean(emailTo),
        },
      );
    }

    if (format === 'html') {
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="social-lifecycle-${Date.now()}.html"`,
        },
      });
    }
    if (format === 'pdf') {
      return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="social-lifecycle-${Date.now()}.pdf"`,
        },
      });
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Social Lifecycle Raporu Üretilemedi',
      detail: error instanceof Error ? error.message : 'admin_social_lifecycle_report_failed',
      type: '/problems/admin-social-lifecycle-report-failed',
      instance: '/api/admin/reports/social-lifecycle',
    });
  }
};
