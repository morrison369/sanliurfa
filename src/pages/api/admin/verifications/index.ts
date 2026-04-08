/**
 * Admin Verification Management
 * GET /api/admin/verifications - Get pending verifications
 */

import type { APIRoute } from 'astro';
import { getPendingVerifications } from '../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin auth required
    if (!locals.user || !locals.isAdmin) {
      recordRequest('GET', '/api/admin/verifications', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

    // Get pending verifications
    const verifications = await getPendingVerifications(limit);

    recordRequest('GET', '/api/admin/verifications', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      verifications,
      count: verifications.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/verifications', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get pending verifications', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get pending verifications',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
