/**
 * Deployment Status (Admin)
 */

import type { APIRoute } from 'astro';
import { getCurrentEnvironment, getReadinessStatusRuntime, getDeploymentChecklistRuntime } from '../../../../lib/deployment';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getRuntimeIntegrationSettings } from '../../../../lib/runtime-integration-settings';
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
      endpoint: '/api/admin/deployment/status',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('GET', '/api/admin/deployment/status', statusCode, duration);
      },
      onSuccess: (_response, duration) => {
        recordRequest('GET', '/api/admin/deployment/status', HttpStatus.OK, duration);
      }
    }, async () => {
      const environment = getCurrentEnvironment();
      const [readiness, checklist, integrationSettings] = await Promise.all([
        getReadinessStatusRuntime(),
        getDeploymentChecklistRuntime(),
        getRuntimeIntegrationSettings()
      ]);
      const artifactHealth = await getAdminArtifactHealthSnapshot();
      const artifactHealthSummary = summarizeArtifactHealth(artifactHealth);
      const configuredCount = Number(Boolean(integrationSettings.resendApiKey)) + Number(Boolean(integrationSettings.analyticsId));

      return apiResponse(
        {
          success: true,
          data: {
            environment: {
              name: environment.name,
              url: environment.url,
              logLevel: environment.logLevel,
              sslEnabled: environment.sslEnabled,
              maintenanceMode: environment.maintenanceMode
            },
            readiness,
            checklist,
            integrations: {
              resend: {
                configured: Boolean(integrationSettings.resendApiKey),
                source: integrationSettings.source.resendApiKey
              },
              analytics: {
                configured: Boolean(integrationSettings.analyticsId),
                source: integrationSettings.source.analyticsId
              },
              summary: {
                configuredCount,
                total: 2,
                fullyConfigured: configuredCount === 2
              }
            },
            artifactHealth,
            artifactHealthSummary,
            timestamp: new Date().toISOString()
          }
        },
        HttpStatus.OK,
        requestId
      );
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/deployment/status', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Deployment status check failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
