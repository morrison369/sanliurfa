/**
 * Get Pending Vendor Verifications (Admin)
 */

import type { APIRoute } from 'astro';
import { getPendingVerifications } from '../../../../lib/vendor-onboarding';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/vendor/pending', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const pending = await getPendingVerifications(50);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/vendor/pending', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: { pending, count: pending.length } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/vendor/pending', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get pending vendors failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
