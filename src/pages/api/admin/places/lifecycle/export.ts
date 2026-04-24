import type { APIRoute } from 'astro';
import { query } from '../../../../../lib/postgres';
import { problemJson } from '../../../../../lib/api';
import { consumeExportToken } from '../../../../../lib/admin/export-tokens';
import { auditSiteChange } from '../../../../../lib/site-content';

function isAdmin(locals: any) {
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

function csvEscape(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET: APIRoute = async ({ url, locals, request }) => {
  const signedToken = String(url.searchParams.get('token') || '').trim();
  const admin = isAdmin(locals);
  let tokenPayload: Record<string, unknown> = {};
  if (!admin) {
    const consumed = await consumeExportToken({
      token: signedToken,
      resourceKey: 'admin.places.lifecycle.export',
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
        detail: 'Admin veya geçerli export token gerekli',
        type: '/problems/admin-places-lifecycle-export-unauthorized',
        instance: '/api/admin/places/lifecycle/export',
      });
    }
    tokenPayload = consumed.payload || {};
  }

  const placeId = String(url.searchParams.get('placeId') || tokenPayload.placeId || '').trim();
  const toStatus = String(url.searchParams.get('toStatus') || tokenPayload.toStatus || '').trim();
  const limitRaw = Number(url.searchParams.get('limit') || 5000);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(10000, limitRaw)) : 5000;

  const where: string[] = [];
  const params: unknown[] = [];
  if (placeId) {
    params.push(placeId);
    where.push(`e.place_id = $${params.length}`);
  }
  if (toStatus) {
    params.push(toStatus);
    where.push(`e.to_status = $${params.length}`);
  }
  params.push(limit);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const result = await query(
      `SELECT
         e.id,
         e.place_id,
         p.name AS place_name,
         e.from_status,
         e.to_status,
         e.actor_user_id,
         u.email AS actor_email,
         e.reason,
         e.metadata,
         e.created_at
       FROM place_lifecycle_events e
       LEFT JOIN places p ON p.id = e.place_id
       LEFT JOIN users u ON u.id = e.actor_user_id
       ${whereSql}
       ORDER BY e.created_at DESC
       LIMIT $${params.length}`,
      params as any[],
    );

    if (admin) {
      await auditSiteChange(
        'admin.places.lifecycle.export',
        'publish',
        {
          userId: locals?.user?.id ? String(locals.user.id) : null,
          actorEmail: locals?.user?.email ? String(locals.user.email) : null,
        },
        {
          placeId: placeId || null,
          toStatus: toStatus || null,
          limit,
          action: 'export_csv',
        },
      );
    }

    const header = [
      'id',
      'place_id',
      'place_name',
      'from_status',
      'to_status',
      'actor_user_id',
      'actor_email',
      'reason',
      'created_at',
      'metadata',
    ];
    const lines = [header.join(',')];
    for (const row of result.rows) {
      lines.push(
        [
          csvEscape(row.id),
          csvEscape(row.place_id),
          csvEscape(row.place_name),
          csvEscape(row.from_status),
          csvEscape(row.to_status),
          csvEscape(row.actor_user_id),
          csvEscape(row.actor_email),
          csvEscape(row.reason),
          csvEscape(row.created_at),
          csvEscape(JSON.stringify(row.metadata || {})),
        ].join(','),
      );
    }

    return new Response(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="place-lifecycle-events.csv"',
      },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Lifecycle Export Başarısız',
      detail: error instanceof Error ? error.message : 'admin_places_lifecycle_export_failed',
      type: '/problems/admin-places-lifecycle-export-failed',
      instance: '/api/admin/places/lifecycle/export',
    });
  }
};
