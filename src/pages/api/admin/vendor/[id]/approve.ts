/**
 * Approve Vendor (Admin)
 */

import type { APIRoute } from 'astro';
import { approveVendor } from '../../../../../lib/vendor-onboarding';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';
import { withAdminOpsWriteAccess } from '../../../../../lib/admin-ops-access';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess({
      request,
      locals,
      endpoint: '/api/admin/vendor/[id]/approve',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('POST', '/api/admin/vendor/[id]/approve', statusCode, duration);
      },
      onSuccess: (response, duration) => {
        recordRequest('POST', '/api/admin/vendor/[id]/approve', response.status, duration);
      }
    }, async () => {
      const { id } = params;

      if (!id) {
        return apiError(ErrorCode.INVALID_INPUT, 'Vendor ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
      }

      const approved = await approveVendor(id);

      if (!approved) {
        return apiError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to approve vendor',
          HttpStatus.INTERNAL_SERVER_ERROR,
          undefined,
          requestId
        );
      }

      logger.logMutation('update', 'vendor_profiles', id, locals.user?.id, { verification_status: 'approved' });
      return apiResponse({ success: true, data: { vendorId: id, approved: true } }, HttpStatus.OK, requestId);
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/vendor/[id]/approve', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Approve vendor failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
