/**
 * Reject Vendor (Admin)
 */

import type { APIRoute } from 'astro';
import { rejectVendor } from '../../../../../lib/vendor-onboarding';
import { validateWithSchema } from '../../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

const schema = {
  reason: { type: 'string' as const, required: true, minLength: 10 }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const { id } = params;

    if (!id) {
      recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.INVALID_INPUT, 'Vendor ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid rejection reason',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { reason } = validation.data as { reason: string };

    const rejected = await rejectVendor(id, reason);

    if (!rejected) {
      recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to reject vendor',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.OK, duration);
    logger.logMutation('update', 'vendor_profiles', id, locals.user?.id, { verification_status: 'rejected', reason });

    return apiResponse({ success: true, data: { vendorId: id, rejected: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Reject vendor failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
