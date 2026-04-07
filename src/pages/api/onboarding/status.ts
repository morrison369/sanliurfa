/**
 * Get User Onboarding Status
 */

import type { APIRoute } from 'astro';
import { getUserOnboardingStatus, getOnboardingProgress } from '../../../lib/user-onboarding';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/onboarding/status', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const status = await getUserOnboardingStatus(locals.user.id);
    const progress = await getOnboardingProgress(locals.user.id);

    if (!status) {
      recordRequest('GET', '/api/onboarding/status', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/onboarding/status', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: { status, progress } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/onboarding/status', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get onboarding status failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
