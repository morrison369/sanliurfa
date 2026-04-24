/**
 * Reject Vendor (Admin)
 */

import type { APIRoute } from 'astro';
import { rejectVendor } from '../../../../../lib/vendor/vendor-onboarding';
import { validateWithSchema, type ValidationSchema } from '../../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

type RejectVendorBody = {
  reason: string;
};

const schema: ValidationSchema = {
  reason: { type: 'string', required: true, minLength: 10 },
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const { id } = params;

    if (!id) {
      recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.INVALID_INPUT, 'İşletme ID gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json().catch(() => ({}));
    const validation = validateWithSchema(body, schema);

    if (!validation.valid) {
      recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Red nedeni geçersiz',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { reason } = validation.data as RejectVendorBody;

    const rejected = await rejectVendor(id, reason);

    if (!rejected) {
      recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'İşletme reddedilemedi',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.OK, duration);
    logger.logMutation('update', 'vendor_profiles', id, locals.user?.id);

    return apiResponse({ success: true, data: { vendorId: id, rejected: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('İşletme reddetme başarısız', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

