import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getAdminArtifactHealthSnapshot, summarizeArtifactHealth } from '../../../../lib/artifact-health';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('GET', '/api/admin/system/artifact-health', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const artifactHealth = await getAdminArtifactHealthSnapshot();
    const summary = summarizeArtifactHealth(artifactHealth);

    recordRequest('GET', '/api/admin/system/artifact-health', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      {
        success: true,
        data: {
          summary,
          artifacts: artifactHealth
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    recordRequest(
      'GET',
      '/api/admin/system/artifact-health',
      HttpStatus.INTERNAL_SERVER_ERROR,
      Date.now() - startTime
    );
    logger.error('Artifact health fetch failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Artifact health özeti alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
