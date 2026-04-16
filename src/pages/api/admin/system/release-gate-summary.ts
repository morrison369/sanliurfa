import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getReleaseGateSummary } from '../../../../lib/release-gate-summary';
import { withAdminOpsReadAccess } from '../../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/system/release-gate-summary',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/system/release-gate-summary', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/system/release-gate-summary', response.status, duration);
        },
      },
      async () => {
        const summary = await getReleaseGateSummary();
        return apiResponse(
          {
            success: true,
            data: summary
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    recordRequest(
      'GET',
      '/api/admin/system/release-gate-summary',
      HttpStatus.INTERNAL_SERVER_ERROR,
      Date.now() - startTime
    );
    logger.error('Release gate summary fetch failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Release gate özeti alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
