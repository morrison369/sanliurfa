/**
 * Admin Dashboard Overview API
 * GET: Get dashboard overview and metrics
 */

import type { APIRoute } from 'astro';
import { getDashboardOverview, getSystemMetrics } from '../../../../lib/admin-dashboard';
import { getModerationStats } from '../../../../lib/admin-moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { getRuntimeIntegrationSettings } from '../../../../lib/runtime-integration-settings';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    // Check admin access
    if (!user || user.role !== 'admin') {
      recordRequest('GET', '/api/admin/dashboard/overview', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin erişimi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 365);

    const [overview, metrics, modStats, integrationSettings] = await Promise.all([
      getDashboardOverview(days),
      getSystemMetrics(),
      getModerationStats(),
      getRuntimeIntegrationSettings()
    ]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/dashboard/overview', HttpStatus.OK, duration);

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
            }
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
