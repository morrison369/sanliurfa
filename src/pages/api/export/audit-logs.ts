import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { convertToCSV, convertToJSON, getContentType, getFileExtension, getFormattedDate } from '../../../lib/export';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.isAdmin) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Admin islemi', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const url = new URL(request.url);
    const format = (url.searchParams.get('format') || 'json') as 'csv' | 'json';
    const days = parseInt(url.searchParams.get('days') || '7');

    const result = await pool.query(
      `SELECT id, user_id, action, resource_type, resource_id, ip_address, created_at
       FROM audit_logs
       WHERE created_at > NOW() - INTERVAL '${days} days'
       ORDER BY created_at DESC`,
      []
    );

    const logs = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      ipAddress: row.ip_address,
      createdAt: row.created_at
    }));

    const data = format === 'csv' ? convertToCSV(logs) : convertToJSON(logs);
    const extension = getFileExtension(format);
    const filename = `audit-logs-${getFormattedDate()}.${extension}`;

    logger.info('Audit logs exported', { userId: locals.user.id, format, count: logs.length });

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    logger.error('Export failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
