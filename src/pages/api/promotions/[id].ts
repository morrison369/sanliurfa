/**
 * Get Promotion Details
 * GET /api/promotions/[id] - Get promotion information
 */

import type { APIRoute } from 'astro';
import { getPromotion } from '../../../lib/promotions-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = params;

    const promotion = await getPromotion(id);

    if (!promotion) {
      recordRequest('GET', '/api/promotions/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Promotion not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    recordRequest('GET', '/api/promotions/[id]', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      promotion
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/promotions/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get promotion', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get promotion',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
