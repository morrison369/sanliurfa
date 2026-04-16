/**
 * Admin Moderation Statistics API
 * GET: Get moderation statistics and queue status
 */

import type { APIRoute } from 'astro';
import { getModerationStats, getModerationQueue } from '../../../../lib/moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { withAdminOpsReadAccess } from '../../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/moderation/stats',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/moderation/stats', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/moderation/stats', response.status, duration);
        },
      },
      async () => {
        const stats = await getModerationStats();
        const queue = await getModerationQueue('pending', 'urgent', 10);

        return apiResponse(
          {
            success: true,
            data: {
              stats,
              queue_preview: queue.slice(0, 10)
            }
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/stats', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get moderation stats failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İstatistikler alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
