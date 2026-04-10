import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { getAuditLogs, getUserActivitySummary, getResourceHistory, findSuspiciousActivity } from '../../../lib/audit';
import { readAdminOpsAuditEntries, summarizeAdminOpsAudit } from '../../../lib/admin-ops-audit';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { withAdminOpsReadAccess } from '../../../lib/admin-ops-access';

function parseOptionalDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

function escapeCsvCell(value: unknown): string {
  const normalized = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildAdminOpsAuditCsv(entries: ReturnType<typeof readAdminOpsAuditEntries>): string {
  const header = [
    'timestamp',
    'endpoint',
    'method',
    'mode',
    'outcome',
    'statusCode',
    'actorKey',
    'requestId',
    'userId',
    'ipAddress',
    'duration'
  ];

  const rows = entries.map((entry) => [
    entry.timestamp,
    entry.endpoint,
    entry.method,
    entry.mode,
    entry.outcome,
    entry.statusCode,
    entry.actorKey,
    entry.requestId ?? '',
    entry.userId ?? '',
    entry.ipAddress,
    entry.duration
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

/**
 * GET /api/admin/audit-logs - Audit loglarını listele
 * Query parametreleri:
 *   - userId: Belirli kullanıcı için filtrele
 *   - resourceType: Belirli kaynak türü için filtrele
 *   - action: Belirli aksiyon için filtrele (create, update, delete, etc)
 *   - status: success veya failure
 *   - startDate: ISO formatında başlangıç tarihi
 *   - endDate: ISO formatında bitiş tarihi
 *   - limit: Kaç kayıt dönsün (default 50, max 500)
 *   - offset: Kaç kayıttan sonra başlasın (pagination)
 *   - summary: true ise sadece özet göster
 */
export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess({
      request,
      locals,
      endpoint: '/api/admin/audit-logs',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('GET', '/api/admin/audit-logs', statusCode, duration);
      },
      onSuccess: (_response, duration) => {
        recordRequest('GET', '/api/admin/audit-logs', HttpStatus.OK, duration);
      }
    }, async () => {
      const query = url.searchParams;
      const source = query.get('source') || 'default';

      if (source === 'admin-ops') {
        const limit = Math.min(parseInt(query.get('limit') || '50'), 500);
        const offset = parseInt(query.get('offset') || '0');
        const requestIdFilter = query.get('requestId')?.trim();
        const startDate = parseOptionalDate(query.get('startDate'));
        const endDate = parseOptionalDate(query.get('endDate'));
        const format = query.get('format')?.trim().toLowerCase();
        const filteredEntries = readAdminOpsAuditEntries()
          .filter((entry) => !requestIdFilter || entry.requestId === requestIdFilter)
          .filter((entry) => {
            const timestamp = new Date(entry.timestamp).getTime();
            if (!Number.isFinite(timestamp)) return false;
            if (startDate && timestamp < startDate.getTime()) return false;
            if (endDate && timestamp > endDate.getTime()) return false;
            return true;
          })
          .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        const entries = filteredEntries.slice(offset, offset + limit);
        const summary = summarizeAdminOpsAudit(24);

        if (format === 'csv') {
          return new Response(buildAdminOpsAuditCsv(entries), {
            status: HttpStatus.OK,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': 'attachment; filename="admin-ops-audit.csv"',
            },
          });
        }

        return apiResponse(
          {
            logs: entries,
            source,
            count: entries.length,
            totalFiltered: filteredEntries.length,
            limit,
            offset,
            summary,
            filters: {
              requestId: requestIdFilter || null,
              startDate: startDate?.toISOString() ?? null,
              endDate: endDate?.toISOString() ?? null,
            }
          },
          HttpStatus.OK,
          requestId
        );
      }

      if (query.get('summary') === 'true') {
        const userId = query.get('userId');
        if (!userId) {
          return apiError(ErrorCode.VALIDATION_ERROR, 'userId gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
        }

        const summary = await getUserActivitySummary(userId, parseInt(query.get('days') || '7'));
        return apiResponse({ summary }, HttpStatus.OK, requestId);
      }

      if (query.get('history') === 'true') {
        const resourceType = query.get('resourceType');
        const resourceId = query.get('resourceId');

        if (!resourceType || !resourceId) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'resourceType ve resourceId gerekli',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }

        const history = await getResourceHistory(resourceType, resourceId);
        return apiResponse({ history }, HttpStatus.OK, requestId);
      }

      if (query.get('suspicious') === 'true') {
        const suspicious = await findSuspiciousActivity(parseInt(query.get('hours') || '24'));
        return apiResponse({ suspicious }, HttpStatus.OK, requestId);
      }

      const filters = {
        userId: query.get('userId') || undefined,
        resourceType: query.get('resourceType') || undefined,
        action: (query.get('action') || undefined) as any,
        status: query.get('status') || undefined,
        startDate: query.get('startDate') ? new Date(query.get('startDate')!) : undefined,
        endDate: query.get('endDate') ? new Date(query.get('endDate')!) : undefined,
        limit: Math.min(parseInt(query.get('limit') || '50'), 500),
        offset: parseInt(query.get('offset') || '0')
      };

      const logs = await getAuditLogs(filters);

      logger.info('Audit logları alındı', {
        count: logs.length,
        filters
      });

      return apiResponse(
        {
          logs,
          filters,
          count: logs.length
        },
        HttpStatus.OK,
        requestId
      );
    });
  } catch (error) {
    logger.error('Audit logları getirilirken hata', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Audit logları getirilirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
