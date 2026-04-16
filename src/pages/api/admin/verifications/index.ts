import type { APIRoute } from 'astro';
import { getPendingVerifications } from '../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { withAdminOpsReadAccess } from '../../../../lib/admin-ops-access';

/**
 * Admin Verification Management
 * GET /api/admin/verifications - Get pending verifications
 */
export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/verifications',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/verifications', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/verifications', response.status, duration);
        },
      },
      async () => {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
        const verifications = await getPendingVerifications(limit);

        return apiResponse(
          {
            success: true,
            verifications,
            count: verifications.length,
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/verifications', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get pending verifications', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get pending verifications',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
