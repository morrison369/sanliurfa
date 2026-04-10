/**
 * Admin Dashboard Overview API
 * GET: Get dashboard overview and metrics
 */

import type { APIRoute } from 'astro';
import { getDashboardOverview, getSystemMetrics, getOperationalSnapshot, getPerformanceOptimizationSummary } from '../../../../lib/admin-dashboard';
import { getModerationStats } from '../../../../lib/admin-moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import {
  classifyIntegrationStatus,
  classifyNightlyStatus,
  classifyOverallOpsStatus,
  classifyReleaseGateStatus
} from '../../../../lib/admin-status';
import { getNightlyOpsSummary } from '../../../../lib/nightly-ops-summary';
import { getReleaseGateSummary } from '../../../../lib/release-gate-summary';
import { getAdminArtifactHealthSnapshot, summarizeArtifactHealth } from '../../../../lib/artifact-health';
import { ensureAdminOpsReadAccess, logAdminOpsRead } from '../../../../lib/admin-ops-access';
import {
  getRuntimeIntegrationSettings,
  verifyRuntimeIntegrationSettings
} from '../../../../lib/runtime-integration-settings';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const accessResponse = ensureAdminOpsReadAccess({
      request,
      locals,
      endpoint: '/api/admin/dashboard/overview',
      requestId,
      startTime
    });
    if (accessResponse) {
      const statusCode = accessResponse.status;
      recordRequest('GET', '/api/admin/dashboard/overview', statusCode, Date.now() - startTime);
      logAdminOpsRead({ endpoint: '/api/admin/dashboard/overview', request, locals, statusCode, duration: Date.now() - startTime });
      return accessResponse;
    }

    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 365);

    const [overview, metrics, modStats, integrationSettings, operational, performanceOptimization, releaseGate, nightly] = await Promise.all([
      getDashboardOverview(days),
      getSystemMetrics(),
      getModerationStats(),
      getRuntimeIntegrationSettings(),
      getOperationalSnapshot(Math.min(days, 30)),
      getPerformanceOptimizationSummary(),
      getReleaseGateSummary(),
      getNightlyOpsSummary()
    ]);
    const artifactHealth = await getAdminArtifactHealthSnapshot();
    const artifactHealthSummary = summarizeArtifactHealth(artifactHealth);
    const integrationVerification = await verifyRuntimeIntegrationSettings(integrationSettings);
    const configuredCount =
      Number(Boolean(integrationSettings.resendApiKey)) + Number(Boolean(integrationSettings.analyticsId));
    const integrationStatus = classifyIntegrationStatus({
      configuredCount,
      total: 2,
      verificationHealthy: integrationVerification.summary.healthy
    });
    const releaseGateStatus = classifyReleaseGateStatus(releaseGate);
    const regressionStatus = classifyNightlyStatus(nightly.regression);
    const e2eStatus = classifyNightlyStatus(nightly.e2e);
    const overallStatus = classifyOverallOpsStatus([
      integrationStatus,
      releaseGateStatus,
      regressionStatus,
      e2eStatus
    ]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/dashboard/overview', HttpStatus.OK, duration);
    logAdminOpsRead({ endpoint: '/api/admin/dashboard/overview', request, locals, statusCode: HttpStatus.OK, duration });

    return apiResponse(
      {
        success: true,
        data: {
          overview,
          metrics,
          moderation: modStats,
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
            },
            verification: integrationVerification
          },
          operational,
          performanceOptimization,
          artifactHealth,
          artifactHealthSummary,
          releaseGate,
          nightly,
          statusSummary: {
            integrations: integrationStatus,
            regression: regressionStatus,
            e2e: e2eStatus,
            releaseGate: releaseGateStatus,
            overall: overallStatus
          },
          period: days
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/dashboard/overview', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get dashboard overview failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Dashboard verisi alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
