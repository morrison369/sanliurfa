/**
 * Verify User Email
 */

import type { APIRoute } from 'astro';
import { verifyUserEmail, getUserOnboardingStatus } from '../../../lib/user-onboarding';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { verifyToken } from '../../../lib/auth';

const schema = {
  token: { type: 'string' as const, required: true, minLength: 20 }
};

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/onboarding/verify-email', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid token',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { token } = validation.data as { token: string };

    // Verify the token
    const session = await verifyToken(token);

    if (!session) {
      recordRequest('POST', '/api/onboarding/verify-email', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_FAILED, 'Invalid or expired token', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // Mark email as verified
    const verified = await verifyUserEmail(session.userId);

    if (!verified) {
      recordRequest('POST', '/api/onboarding/verify-email', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to verify email',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const status = await getUserOnboardingStatus(session.userId);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/onboarding/verify-email', HttpStatus.OK, duration);
    logger.info('Email verified via token', { userId: session.userId, duration });

    return apiResponse(
      { success: true, data: { verified: true, status } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/onboarding/verify-email', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Email verification failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
