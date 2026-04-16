import type { APIRoute } from 'astro';
import { getModerationQueue, assignModerationQueueItem, resolveModerationQueueItem } from '../../../../lib/admin-moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

/**
 * Admin Moderation Queue API
 * GET: Get moderation queue items
 * POST: Take action on queue items
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/moderation/queue',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/moderation/queue', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/moderation/queue', response.status, duration);
        },
      },
      async () => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status') || 'pending';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const items = await getModerationQueue(status, limit, offset);

        return apiResponse(
          {
            success: true,
            data: {
              items,
              count: items.length,
              status,
              limit,
              offset,
            },
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/queue', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get moderation queue failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Moderasyon kuyruğu alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/moderation/queue',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('POST', '/api/admin/moderation/queue', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('POST', '/api/admin/moderation/queue', response.status, duration);
        },
      },
      async () => {
        const body = await request.json();
        const { queueItemId, action, resolution } = body;

        if (!queueItemId || !action) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'queueItemId ve action gereklidir',
            HttpStatus.UNPROCESSABLE_ENTITY,
            undefined,
            requestId
          );
        }

        if (action === 'assign') {
          await assignModerationQueueItem(queueItemId, locals.user?.id || 'unknown');
        } else if (action === 'resolve') {
          await resolveModerationQueueItem(queueItemId, locals.user?.id || 'unknown', resolution || 'resolved');
        }

        logger.info('Moderation queue action completed', {
          queueItemId,
          action,
          adminId: locals.user?.id,
        });

        return apiResponse(
          {
            success: true,
            message: `Moderasyon işlemi tamamlandı: ${action}`,
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/moderation/queue', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Moderation queue action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Moderasyon işlemi başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
