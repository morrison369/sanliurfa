/**
 * Reject Vendor (Admin)
 */

import type { APIRoute } from 'astro';
import { rejectVendor } from '../../../../../lib/vendor-onboarding';
import { validateWithSchema } from '../../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';
import { withAdminOpsWriteAccess } from '../../../../../lib/admin-ops-access';

const schema = {
  reason: { type: 'string' as const, required: true, minLength: 10 }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess({
      request,
      locals,
      endpoint: '/api/admin/vendor/[id]/reject',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('POST', '/api/admin/vendor/[id]/reject', statusCode, duration);
      },
      onSuccess: (response, duration) => {
        recordRequest('POST', '/api/admin/vendor/[id]/reject', response.status, duration);
      }
    }, async () => {
      const { id } = params;

      if (!id) {
        return apiError(ErrorCode.INVALID_INPUT, 'Vendor ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
      }

      const body = await request.json();
      const validation = validateWithSchema(body, schema as any);

      if (!validation.valid) {
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
        return apiError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to reject vendor',
          HttpStatus.INTERNAL_SERVER_ERROR,
          undefined,
          requestId
        );
      }

      logger.logMutation('update', 'vendor_profiles', id, locals.user?.id, { verification_status: 'rejected', reason });
      return apiResponse({ success: true, data: { vendorId: id, rejected: true } }, HttpStatus.OK, requestId);
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/vendor/[id]/reject', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Reject vendor failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
