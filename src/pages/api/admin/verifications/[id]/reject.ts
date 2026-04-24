/**
 * Reject Place Verification (Admin)
 * POST /api/admin/verifications/[id]/reject - Reject a verification request
 */

import type { APIRoute } from 'astro';
import { rejectVerification } from '../../../../../lib/place/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logging';
import { recordRequest } from '../../../../../lib/metrics';
import { validateWithSchema, type ValidationSchema } from '../../../../../lib/validation';

const rejectSchema: ValidationSchema = {
  reason: {
    type: 'string' as const,
    required: true,
    minLength: 10,
    maxLength: 1000,
    sanitize: true
  }
};

type RejectBody = {
  reason: string;
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin auth required
    if (!locals.user || !locals.isAdmin) {
      recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Yönetici yetkisi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const { id: verificationId } = params;

    if (!verificationId) {
      recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Doğrulama başvuru ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Get request body
    const body = (await request.json().catch(() => ({}))) as Partial<RejectBody>;

    // Validate input
    const validation = validateWithSchema(body, rejectSchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz veri',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const reason = (validation.data as RejectBody).reason;

    // Reject verification
    const success = await rejectVerification(verificationId, locals.user.id, reason);

    if (!success) {
      recordRequest('POST', '/api/admin/verifications/[id]/reject', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Doğrulama başvurusu bulunamadı',
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
    logger.error('Doğrulama başvurusu reddedilemedi', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Doğrulama başvurusu reddedilirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
