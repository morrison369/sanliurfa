import type { APIRoute } from 'astro';
import { query } from '../../../../../lib/postgres';
import { problemJson, safeErrorDetail, safeIntParam } from '../../../../../lib/api';
import { consumeExportToken } from '../../../../../lib/admin/export-tokens';
import { auditSiteChange } from '../../../../../lib/site-content';

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

function csvEscape(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET: APIRoute = async ({ url, locals, request, clientAddress }) => {
  const signedToken = String(url.searchParams.get('token') || '').trim();
  const admin = isAdmin(locals);
  let tokenPayload: Record<string, unknown> = {};
  if (!admin) {
    const consumed = await consumeExportToken({
      token: signedToken,
      resourceKey: 'admin.social.events.export',
      requestIp:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        clientAddress ||
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
        detail: 'Admin veya geçerli export token gerekli',
        type: '/problems/admin-social-events-export-unauthorized',
        instance: '/api/admin/social/events/export',
      });
    }
    tokenPayload = consumed.payload || {};
  }

  const eventType = String(url.searchParams.get('eventType') || tokenPayload.eventType || '').trim();
  const actorUserId = String(url.searchParams.get('actorUserId') || tokenPayload.actorUserId || '').trim();
  const targetUserId = String(url.searchParams.get('targetUserId') || tokenPayload.targetUserId || '').trim();
  const tenantId = String(url.searchParams.get('tenantId') || tokenPayload.tenantId || '').trim();
  const limit = safeIntParam(url.searchParams.get('limit'), 5000, 1, 10000);

  const where: string[] = [];
  const params: unknown[] = [];
  if (eventType) {
    params.push(eventType);
    where.push(`event_type = $${params.length}`);
  }
  if (actorUserId) {
    params.push(actorUserId);
    where.push(`actor_user_id = $${params.length}`);
  }
  if (targetUserId) {
    params.push(targetUserId);
    where.push(`target_user_id = $${params.length}`);
  }
  if (tenantId) {
    params.push(tenantId);
    where.push(`tenant_id = $${params.length}`);
  }
  params.push(limit);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const result = await query(
      `SELECT id, tenant_id, event_type, actor_user_id, target_user_id, conversation_id, metadata, created_at
       FROM social_event_store
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params,
    );

    if (admin) {
      await auditSiteChange(
        'admin.social.events.export',
        'publish',
        {
          userId: locals?.user?.id ? String(locals.user.id) : null,
          actorEmail: locals?.user?.email ? String(locals.user.email) : null,
        },
        {
          eventType: eventType || null,
          actorUserId: actorUserId || null,
          targetUserId: targetUserId || null,
          tenantId: tenantId || null,
          limit,
          action: 'export_csv',
        },
      );
    }

    const header = [
      'id',
      'tenant_id',
      'event_type',
      'actor_user_id',
      'target_user_id',
      'conversation_id',
      'created_at',
      'metadata',
    ];
    const lines = [header.join(',')];
    for (const row of result.rows) {
      lines.push(
        [
          csvEscape(row.id),
          csvEscape(row.tenant_id),
          csvEscape(row.event_type),
          csvEscape(row.actor_user_id),
          csvEscape(row.target_user_id),
          csvEscape(row.conversation_id),
          csvEscape(row.created_at),
          csvEscape(JSON.stringify(row.metadata || {})),
        ].join(','),
      );
    }

    return new Response(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="social-events.csv"',
      },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Sosyal Event Export Başarısız',
      detail: safeErrorDetail(error, 'admin_social_events_export_failed'),
      type: '/problems/admin-social-events-export-failed',
      instance: '/api/admin/social/events/export',
    });
  }
};
