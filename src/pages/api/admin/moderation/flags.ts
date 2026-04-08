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

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('GET', '/api/admin/moderation/flags', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const flags = await getContentFlags(status, limit, offset);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/flags', HttpStatus.OK, duration);

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
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('POST', '/api/admin/moderation/flags', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { flagId, decision, notes } = body;

    if (!flagId || !decision) {
      recordRequest('POST', '/api/admin/moderation/flags', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'flagId ve decision gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (!['approved', 'rejected', 'escalated'].includes(decision)) {
      recordRequest('POST', '/api/admin/moderation/flags', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz decision değeri',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    await reviewContentFlag(flagId, user.id, decision as any, notes || '');

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/moderation/flags', HttpStatus.OK, duration);

    logger.info('Content flag reviewed', { flagId, decision, adminId: user.id });

    return apiResponse(
      {
        success: true,
        message: `İçerik bayrağı incelendi: ${decision}`
      },
      HttpStatus.OK,
      requestId
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
