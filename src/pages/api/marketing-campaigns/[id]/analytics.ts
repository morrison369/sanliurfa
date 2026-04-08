/**
 * Marketing Campaign Analytics API
 * GET: Get campaign performance metrics
 */

import type { APIRoute } from 'astro';
import { getCampaignPerformance } from '../../../../lib/marketing-campaigns';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/marketing-campaigns/[id]/analytics', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      recordRequest('GET', '/api/marketing-campaigns/[id]/analytics', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 365);

    const performance = await getCampaignPerformance(id, locals.user.id, days);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/marketing-campaigns/[id]/analytics', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: performance },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const statusCode = (error instanceof Error && error.message === 'Access denied') ? HttpStatus.FORBIDDEN : HttpStatus.INTERNAL_SERVER_ERROR;
    recordRequest('GET', '/api/marketing-campaigns/[id]/analytics', statusCode, duration);
    logger.error('Get campaign analytics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get analytics',
      statusCode,
      undefined,
      requestId
    );
  }
};
