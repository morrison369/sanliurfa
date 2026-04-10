/**
 * Deployment Status (Admin)
 */

import type { APIRoute } from 'astro';
import { getCurrentEnvironment, getReadinessStatusRuntime, getDeploymentChecklistRuntime } from '../../../../lib/deployment';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getRuntimeIntegrationSettings } from '../../../../lib/runtime-integration-settings';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/deployment/status', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const environment = getCurrentEnvironment();
    const [readiness, checklist, integrationSettings] = await Promise.all([
      getReadinessStatusRuntime(),
      getDeploymentChecklistRuntime(),
      getRuntimeIntegrationSettings()
    ]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/deployment/status', HttpStatus.OK, duration);

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
            }
          },
          timestamp: new Date().toISOString()
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/deployment/status', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Deployment status check failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
