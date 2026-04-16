/**
 * Admin Content Flags API
 * GET: Get content flags
 * POST: Review/action on flags
 */

import type { APIRoute } from 'astro';
import { getContentFlags, reviewContentFlag } from '../../../../lib/admin-moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/moderation/flags',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/moderation/flags', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/moderation/flags', response.status, duration);
        },
      },
      async () => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status') || 'pending';
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        const flags = await getContentFlags(status, limit, offset);

        return apiResponse(
          {
            success: true,
            data: {
              flags,
              count: flags.length,
              status,
              limit,
              offset
            }
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/flags', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get content flags failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İçerik bayrakları alınırken bir hata oluştu',
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
        endpoint: '/api/admin/moderation/flags',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('POST', '/api/admin/moderation/flags', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('POST', '/api/admin/moderation/flags', response.status, duration);
        },
      },
      async () => {
        const body = await request.json();
        const { flagId, decision, notes } = body;

        if (!flagId || !decision) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'flagId ve decision gereklidir',
            HttpStatus.UNPROCESSABLE_ENTITY,
            undefined,
            requestId
          );
        }

        if (!['approved', 'rejected', 'escalated'].includes(decision)) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'Geçersiz decision değeri',
            HttpStatus.UNPROCESSABLE_ENTITY,
            undefined,
            requestId
          );
        }

        await reviewContentFlag(flagId, locals.user?.id || 'unknown', decision as any, notes || '');

        logger.info('Content flag reviewed', { flagId, decision, adminId: locals.user?.id });

        return apiResponse(
          {
            success: true,
            message: `İçerik bayrağı incelendi: ${decision}`
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/moderation/flags', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Review flag failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Bayrak incelemesi başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
