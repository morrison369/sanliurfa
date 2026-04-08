/**
 * Admin Moderation Queue API
 * GET: Get moderation queue items
 * POST: Take action on queue items
 */

import type { APIRoute } from 'astro';
import { getModerationQueue, assignModerationQueueItem, resolveModerationQueueItem } from '../../../../lib/admin-moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('GET', '/api/admin/moderation/queue', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const items = await getModerationQueue(status, limit, offset);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/queue', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          items,
          count: items.length,
          status,
          limit,
          offset
        }
      },
      HttpStatus.OK,
      requestId
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
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('POST', '/api/admin/moderation/queue', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { queueItemId, action, resolution } = body;

    if (!queueItemId || !action) {
      recordRequest('POST', '/api/admin/moderation/queue', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'queueItemId ve action gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (action === 'assign') {
      await assignModerationQueueItem(queueItemId, user.id);
    } else if (action === 'resolve') {
      await resolveModerationQueueItem(queueItemId, user.id, resolution || 'resolved');
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/moderation/queue', HttpStatus.OK, duration);

    logger.info('Moderation queue action completed', { queueItemId, action, adminId: user.id });

    return apiResponse(
      {
        success: true,
        message: `Moderasyon işlemi tamamlandı: ${action}`
      },
      HttpStatus.OK,
      requestId
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
