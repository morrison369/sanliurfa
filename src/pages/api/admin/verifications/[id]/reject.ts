/**
 * Reject Place Verification (Admin)
 * POST /api/admin/verifications/[id]/reject - Reject a verification request
 */

import type { APIRoute } from 'astro';
import { rejectVerification } from '../../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logging';
import { recordRequest } from '../../../../../lib/metrics';
import { validateWithSchema } from '../../../../../lib/validation';

const rejectSchema = {
  reason: {
    type: 'string' as const,
    required: true,
    minLength: 10,
    maxLength: 1000,
    sanitize: true
  }
} as any;

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin auth required
    if (!locals.user || !locals.isAdmin) {
      recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const { id: verificationId } = params;

    // Get request body
    const body = await request.json();

    // Validate input
    const validation = validateWithSchema(body, rejectSchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const reason = validation.data.reason;

    // Reject verification
    const success = await rejectVerification(verificationId, locals.user.id, reason);

    if (!success) {
      recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Verification request not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.OK, Date.now() - startTime);

    logger.logMutation('reject', 'place_verification', verificationId, locals.user.id);

    return apiResponse({
      success: true,
      message: 'Doğrulama başvurusu reddedildi'
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to reject verification', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to reject verification',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
