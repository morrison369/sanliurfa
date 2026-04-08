/**
 * Funnel Analytics Endpoint
 * Create and analyze conversion funnels
 */

import type { APIRoute } from 'astro';
import { listFunnels, getFunnelById, createFunnel, getFunnelAnalytics, optimizeFunnelSteps } from '../../../lib/funnel-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const funnelId = url.searchParams.get('id');
    const withAnalytics = url.searchParams.get('analytics') === 'true';
    const days = parseInt(url.searchParams.get('days') || '30');

    if (funnelId) {
      const funnel = await getFunnelById(funnelId);
      if (!funnel) {
        return apiError(ErrorCode.NOT_FOUND, 'Funnel not found', HttpStatus.NOT_FOUND, undefined, requestId);
      }

      let analytics = null;
      let recommendations = null;

      if (withAnalytics) {
        analytics = await getFunnelAnalytics(funnelId, days);
        recommendations = await optimizeFunnelSteps(funnelId);
      }

      return apiResponse({
        success: true,
        data: { funnel, analytics, recommendations }
      }, HttpStatus.OK, requestId);
    }

    const funnels = await listFunnels();

    return apiResponse({
      success: true,
      data: funnels
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get funnels', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { funnel_name, funnel_key, goal_description, steps } = body;

    if (!funnel_name || !funnel_key || !steps || !Array.isArray(steps)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Funnel name, key, and steps required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const funnel = await createFunnel(locals.user.id, funnel_name, funnel_key, goal_description, steps);

    if (!funnel) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create funnel', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    return apiResponse({
      success: true,
      data: funnel
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Failed to create funnel', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
