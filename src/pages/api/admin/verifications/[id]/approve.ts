import type { APIRoute } from 'astro';
import { approveVerification } from '../../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logging';
import { recordRequest } from '../../../../../lib/metrics';
import { validateWithSchema } from '../../../../../lib/validation';
import { withAdminOpsWriteAccess } from '../../../../../lib/admin-ops-access';

const approveSchema = {
  reason: {
    type: 'string' as const,
    required: false,
    maxLength: 1000,
    sanitize: true,
  },
} as any;

/**
 * Approve Place Verification (Admin)
 * POST /api/admin/verifications/[id]/approve - Approve a verification request
 */
export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  const endpoint = '/api/admin/verifications/[id]/approve';
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint,
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('POST', endpoint, statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('POST', endpoint, response.status, duration);
        },
      },
      async () => {
        const { id: verificationId } = params;
        const body = await request.json();
        const validation = validateWithSchema(body, approveSchema);

        if (!validation.valid) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid input',
            HttpStatus.UNPROCESSABLE_ENTITY,
            validation.errors,
            requestId
          );
        }

        const success = await approveVerification(
          verificationId as string,
          locals.user?.id || 'unknown',
          validation.data.reason
        );

        if (!success) {
          return apiError(
            ErrorCode.NOT_FOUND,
            'Verification request not found',
            HttpStatus.NOT_FOUND,
            undefined,
            requestId
          );
        }

        logger.logMutation('approve', 'place_verification', verificationId as string, locals.user?.id || 'unknown');

        return apiResponse(
          {
            success: true,
            message: 'Doğrulama başvurusu onaylandı',
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', endpoint, HttpStatus.INTERNAL_SERVER_ERROR, duration);
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
