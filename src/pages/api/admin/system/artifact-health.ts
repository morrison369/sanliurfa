import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getAdminArtifactHealthSnapshot, summarizeArtifactHealth } from '../../../../lib/artifact-health';
import { withAdminOpsReadAccess } from '../../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess({
      request,
      locals,
      endpoint: '/api/admin/system/artifact-health',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('GET', '/api/admin/system/artifact-health', statusCode, duration);
      },
      onSuccess: (_response, duration) => {
        recordRequest('GET', '/api/admin/system/artifact-health', HttpStatus.OK, duration);
      }
    }, async () => {
      const artifactHealth = await getAdminArtifactHealthSnapshot();
      const summary = summarizeArtifactHealth(artifactHealth);

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
    });
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
