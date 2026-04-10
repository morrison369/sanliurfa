import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getReleaseGateSummary } from '../../../../lib/release-gate-summary';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('GET', '/api/admin/system/release-gate-summary', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const summary = await getReleaseGateSummary();
    recordRequest('GET', '/api/admin/system/release-gate-summary', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      {
        success: true,
        data: summary
      },
      HttpStatus.OK,
      requestId
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
