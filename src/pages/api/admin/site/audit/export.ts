import type { APIRoute } from 'astro';
import { query } from '../../../../../lib/postgres';
import { problemJson } from '../../../../../lib/api';

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

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-site-audit-export-unauthorized',
      instance: '/api/admin/site/audit/export',
    });
  }

  const key = String(url.searchParams.get('key') || '').trim();
  const action = String(url.searchParams.get('action') || '').trim();
  const limitRaw = Number(url.searchParams.get('limit') || 1000);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(5000, limitRaw)) : 1000;

  const where: string[] = [];
  const params: any[] = [];

  if (key) {
    params.push(key);
    where.push(`setting_key = $${params.length}`);
  }
  if (action) {
    params.push(action);
    where.push(`action = $${params.length}`);
  }
  params.push(limit);

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const result = await query(
      `
      SELECT
        created_at,
        setting_key,
        action,
        actor_user_id,
        actor_email,
        ip_address::text AS ip_address,
        user_agent,
        metadata
      FROM site_change_audit
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${params.length}
      `,
      params,
    );

    const header = [
      'created_at',
      'setting_key',
      'action',
      'actor_user_id',
      'actor_email',
      'ip_address',
      'user_agent',
      'metadata',
    ];
    const lines = [header.join(',')];
    for (const row of result.rows) {
      lines.push(
        [
          csvEscape(row.created_at),
          csvEscape(row.setting_key),
          csvEscape(row.action),
          csvEscape(row.actor_user_id),
          csvEscape(row.actor_email),
          csvEscape(row.ip_address),
          csvEscape(row.user_agent),
          csvEscape(JSON.stringify(row.metadata || {})),
        ].join(','),
      );
    }

    return new Response(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="site-change-audit.csv"',
      },
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Audit Export Başarısız',
      detail: error instanceof Error ? error.message : 'audit export failed',
      type: '/problems/admin-site-audit-export-failed',
      instance: '/api/admin/site/audit/export',
    });
  }
};
