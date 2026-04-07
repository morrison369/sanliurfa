/**
 * Get Vendor Onboarding Progress
 */

import type { APIRoute } from 'astro';
import { getOnboardingProgress, completeOnboarding } from '../../../../lib/vendor-onboarding';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/vendor/onboarding/progress', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const progress = await getOnboardingProgress(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/vendor/onboarding/progress', HttpStatus.OK, duration);

    return apiResponse({ success: true, data: { progress, userId: locals.user.id } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/vendor/onboarding/progress', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get onboarding progress failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// POST to complete onboarding
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/vendor/onboarding/progress', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const completed = await completeOnboarding(locals.user.id);

    if (!completed) {
      recordRequest('POST', '/api/vendor/onboarding/progress', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to complete onboarding',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/vendor/onboarding/progress', HttpStatus.OK, duration);
    logger.logMutation('update', 'users', locals.user.id, locals.user.id, { vendor_onboarded: true });

    return apiResponse({ success: true, data: { completed: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/vendor/onboarding/progress', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Complete onboarding failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
