import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

interface AuditLogPayload {
  entity?: string;
  entityId?: string;
  action?: string;
  metadata?: unknown;
  changes?: {
    old?: unknown;
    new?: unknown;
  };
}

interface AuditInsertRow {
  id: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = (await request.json()) as AuditLogPayload;

    if (!data.entity || !data.action) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Zorunlu alanlar eksik',
        type: '/problems/audit-log-validation',
        instance: '/api/audit/log',
      });
    }

    const result = await query<AuditInsertRow>(
      `INSERT INTO audit_logs
         (user_id, action, resource_type, resource_id, description,
          old_values, new_values, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'success')
       RETURNING id`,
      [
        locals.user?.id || null,
        data.action,
        data.entity,
        data.entityId || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.changes?.old ? JSON.stringify(data.changes.old) : null,
        data.changes?.new ? JSON.stringify(data.changes.new) : null,
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        request.headers.get('user-agent') || null,
      ]
    );

    return new Response(
      JSON.stringify({ success: true, id: result.rows[0].id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Audit log POST error:', error);
    return problemJson({
      status: 500,
      title: 'Audit Log Yazılamadı',
      detail: 'Sunucu hatası',
      type: '/problems/audit-log-post-failed',
      instance: '/api/audit/log',
    });
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/audit-log-unauthorized',
      instance: '/api/audit/log',
    });
  }

  try {
    const url    = new URL(request.url);
    const entity = url.searchParams.get('entity');
    const action = url.searchParams.get('action');
    const actor  = url.searchParams.get('actor');
    const limit  = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);

    const params: string[] = [];
    let where = 'WHERE 1=1';
    let idx = 1;

    if (entity) { where += ` AND resource_type = $${idx++}`; params.push(entity); }
    if (action) { where += ` AND action = $${idx++}`; params.push(action); }
    if (actor) {
      where += ` AND (u.email = $${idx} OR u.full_name = $${idx})`;
      params.push(actor); idx++;
    }

    const result = await query(
      `SELECT
         a.id, a.created_at AS timestamp,
         a.resource_type AS entity, a.resource_id AS entity_id,
         a.action, a.description, a.old_values, a.new_values,
         a.ip_address AS ip, a.status,
         COALESCE(u.email, 'system') AS actor,
         CASE WHEN u.id IS NOT NULL THEN 'user' ELSE 'system' END AS actor_type
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx}`,
      [...params, limit]
    );

    return new Response(
      JSON.stringify({ entries: result.rows, total: result.rows.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Audit log GET error:', error);
    return problemJson({
      status: 500,
      title: 'Audit Log Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/audit-log-get-failed',
      instance: '/api/audit/log',
    });
  }
};
