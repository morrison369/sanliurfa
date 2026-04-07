/**
 * Complete User Profile
 */

import type { APIRoute } from 'astro';
import { completeUserProfile, getUserOnboardingStatus, autoCompleteOnboarding } from '../../../lib/user-onboarding';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const schema = {
  fullName: { type: 'string' as const, required: true, minLength: 2, maxLength: 100 },
  bio: { type: 'string' as const, required: true, minLength: 10, maxLength: 500 },
  avatar: { type: 'string' as const, required: false }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/onboarding/complete-profile', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/onboarding/complete-profile', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid profile data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { fullName, bio, avatar } = validation.data as any;

    // Complete the profile
    const completed = await completeUserProfile(locals.user.id, {
      fullName,
      bio,
      avatar
    });

    if (!completed) {
      recordRequest('POST', '/api/onboarding/complete-profile', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to complete profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    // Try to auto-complete onboarding
    await autoCompleteOnboarding(locals.user.id);

    const status = await getUserOnboardingStatus(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/onboarding/complete-profile', HttpStatus.OK, duration);
    logger.logMutation('update', 'users', locals.user.id, locals.user.id, { fullName, bio });

    return apiResponse(
      { success: true, data: { completed: true, status } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/onboarding/complete-profile', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Complete profile failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
