/**
 * Approve Place Verification (Admin)
 * POST /api/admin/verifications/[id]/approve - Approve a verification request
 */

import type { APIRoute } from 'astro';
import { approveVerification } from '../../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logging';
import { recordRequest } from '../../../../../lib/metrics';
import { validateWithSchema } from '../../../../../lib/validation';

const approveSchema = {
  reason: {
    type: 'string' as const,
    required: false,
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
      recordRequest('POST', '/api/admin/verifications/[id]/approve', HttpStatus.FORBIDDEN, Date.now() - startTime);
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
    const validation = validateWithSchema(body, approveSchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/admin/verifications/[id]/approve', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const reason = validation.data.reason;

    // Approve verification
    const success = await approveVerification(verificationId, locals.user.id, reason);

    if (!success) {
      recordRequest('POST', '/api/admin/verifications/[id]/approve', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Verification request not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    recordRequest('POST', '/api/admin/verifications/[id]/approve', HttpStatus.OK, Date.now() - startTime);

    logger.logMutation('approve', 'place_verification', verificationId, locals.user.id);

    return apiResponse({
      success: true,
      message: 'Doğrulama başvurusu onaylandı'
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/verifications/[id]/approve', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to approve verification', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to approve verification',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
