/**
 * Admin System Metrics API
 * GET: Get system-wide metrics and health
 */

import type { APIRoute } from 'astro';
import { getSystemMetrics, getOperationalSnapshot, getPerformanceOptimizationSummary } from '../../../../lib/admin-dashboard';
import {
  classifyIntegrationStatus,
  classifyNightlyStatus,
  classifyOverallOpsStatus,
  classifyReleaseGateStatus
} from '../../../../lib/admin-status';
import { getModerationStats } from '../../../../lib/admin-moderation';
import { getModerationQueue, getContentFlags } from '../../../../lib/admin-moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getNightlyOpsSummary } from '../../../../lib/nightly-ops-summary';
import { getReleaseGateSummary } from '../../../../lib/release-gate-summary';
import { getRuntimeIntegrationSettings } from '../../../../lib/runtime-integration-settings';
import { getAdminArtifactHealthSnapshot } from '../../../../lib/artifact-health';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('GET', '/api/admin/system/metrics', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const [systemMetrics, modStats, pendingQueue, pendingFlags, integrationSettings, operational, performanceOptimization, nightly, releaseGate] = await Promise.all([
      getSystemMetrics(),
      getModerationStats(),
      getModerationQueue('pending', 1),
      getContentFlags('pending', 1),
      getRuntimeIntegrationSettings(),
      getOperationalSnapshot(7),
      getPerformanceOptimizationSummary(),
      getNightlyOpsSummary(),
      getReleaseGateSummary()
    ]);
    const artifactHealth = await getAdminArtifactHealthSnapshot();
    const configuredCount =
      Number(Boolean(integrationSettings.resendApiKey)) + Number(Boolean(integrationSettings.analyticsId));
    const integrationStatus = classifyIntegrationStatus({
      configuredCount,
      total: 2
    });
    const regressionStatus = classifyNightlyStatus(nightly.regression);
    const e2eStatus = classifyNightlyStatus(nightly.e2e);
    const releaseGateStatus = classifyReleaseGateStatus(releaseGate);
    const overallStatus = classifyOverallOpsStatus([
      integrationStatus,
      regressionStatus,
      e2eStatus,
      releaseGateStatus
    ]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/system/metrics', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          system: systemMetrics,
          moderation: modStats,
          pendingWork: {
            queueCount: (await getModerationQueue('pending', 1000))?.length || 0,
            flagCount: (await getContentFlags('pending', 1000))?.length || 0
          },
          health: {
            status: integrationStatus,
            timestamp: new Date().toISOString(),
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
            }
          },
          operational,
          performanceOptimization,
          artifactHealth,
          nightly,
          releaseGate,
          statusSummary: {
            integrations: integrationStatus,
            regression: regressionStatus,
            e2e: e2eStatus,
            releaseGate: releaseGateStatus,
            overall: overallStatus
          }
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/system/metrics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get system metrics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Sistem metrikleri alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
