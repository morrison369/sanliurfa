/**
 * Campaign Analytics API
 * GET: Get campaign analytics and metrics
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../../lib/postgres';
import {
  getCampaignOverview,
  getDailyMetrics,
  getEngagementTimeline,
  getTopLinks,
  getEngagementByDevice,
  getGeographicEngagement,
  getSubscriberSegments,
} from '../../../../../lib/email-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { recordRequest } from '../../../../../lib/metrics';
import { logger } from '../../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/campaigns/[id]/analytics', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: campaignId } = params;
    if (!campaignId) {
      recordRequest('GET', '/api/email/campaigns/[id]/analytics', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Campaign ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const campaign = await queryOne(
      'SELECT user_id FROM email_campaigns WHERE id = $1',
      [campaignId]
    );

    if (!campaign || campaign.user_id !== locals.user.id) {
      recordRequest('GET', '/api/email/campaigns/[id]/analytics', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const metrics = url.searchParams.get('metrics')?.split(',') || [
      'overview',
      'daily',
      'timeline',
      'links',
      'devices',
      'geographic',
      'segments',
    ];

    const data: any = {};

    if (metrics.includes('overview')) {
      data.overview = await getCampaignOverview(campaignId);
    }

    if (metrics.includes('daily')) {
      const days = parseInt(url.searchParams.get('days') || '30', 10);
      data.daily = await getDailyMetrics(campaignId, days);
    }

    if (metrics.includes('timeline')) {
      const hours = parseInt(url.searchParams.get('hours') || '24', 10);
      data.timeline = await getEngagementTimeline(campaignId, hours);
    }

    if (metrics.includes('links')) {
      const limit = parseInt(url.searchParams.get('linkLimit') || '10', 10);
      data.topLinks = await getTopLinks(campaignId, limit);
    }

    if (metrics.includes('devices')) {
      data.devices = await getEngagementByDevice(campaignId);
    }

    if (metrics.includes('geographic')) {
      data.geographic = await getGeographicEngagement(campaignId);
    }

    if (metrics.includes('segments')) {
      data.segments = await getSubscriberSegments(campaignId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/campaigns/[id]/analytics', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/campaigns/[id]/analytics', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get campaign analytics failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get campaign analytics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
