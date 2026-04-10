import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { getAuditLogs, getUserActivitySummary, getResourceHistory, findSuspiciousActivity } from '../../../lib/audit';
import { readAdminOpsAuditEntries } from '../../../lib/admin-ops-audit';
import { logger } from '../../../lib/logging';

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
  logger.setRequestId(requestId);

  // Sadece admin erişebilir
  if (!locals.isAdmin) {
    logger.warn('Yetkisiz audit log erişim', { userId: locals.user?.id });
    return apiError(ErrorCode.FORBIDDEN, 'Yetkisiz', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  try {
    const query = url.searchParams;
    const source = query.get('source') || 'default';

    if (source === 'admin-ops') {
      const limit = Math.min(parseInt(query.get('limit') || '50'), 500);
      const offset = parseInt(query.get('offset') || '0');
      const entries = readAdminOpsAuditEntries()
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(offset, offset + limit);

      return apiResponse(
        {
          logs: entries,
          source,
          count: entries.length,
          limit,
          offset
        },
        HttpStatus.OK,
        requestId
      );
    }

    // Özet modu
    if (query.get('summary') === 'true') {
      const userId = query.get('userId');
      if (!userId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'userId gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
      }

      const summary = await getUserActivitySummary(userId, parseInt(query.get('days') || '7'));
      return apiResponse({ summary }, HttpStatus.OK, requestId);
    }

    // Kaynak geçmişi modu
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

    // Şüpheli aktivite modu
    if (query.get('suspicious') === 'true') {
      const suspicious = await findSuspiciousActivity(parseInt(query.get('hours') || '24'));
      return apiResponse({ suspicious }, HttpStatus.OK, requestId);
    }

    // Normal filtreleme modu
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
