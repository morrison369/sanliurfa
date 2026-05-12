/**
 * User Journey Analytics Endpoint
 * Track and analyze user paths
 */

import type { APIRoute } from 'astro';
import { getUserJourneys, getJourneyDetails, getTopConvertingPaths, analyzeBehaviorPattern } from '../../../lib/analytics/journey-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const VALID_JOURNEY_TYPES = new Set(['journeys', 'journey_details', 'top_paths', 'behavior_pattern']);
    const rawType = url.searchParams.get('type') || 'journeys';
    const type = VALID_JOURNEY_TYPES.has(rawType) ? rawType : 'journeys';
    const userId = url.searchParams.get('user_id');
    const journeyId = url.searchParams.get('journey_id');
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 0, 1_000_000);

    if (type === 'journeys') {
      if (!userId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'User ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      // User can only access their own journeys (admin-only override, not moderator)
      if (locals.user.role !== 'admin' && userId !== locals.user.id) {
        return apiError(ErrorCode.FORBIDDEN, 'Cannot access other users journeys', HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const journeys = await getUserJourneys(userId, limit);
      return apiResponse({
        success: true,
        data: journeys
      }, HttpStatus.OK, requestId);
    }

    if (type === 'journey_details') {
      if (!journeyId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'Journey ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      const details = await getJourneyDetails(journeyId);
      if (!details) {
        return apiError(ErrorCode.NOT_FOUND, 'Journey not found', HttpStatus.NOT_FOUND, undefined, requestId);
      }

      return apiResponse({
        success: true,
        data: details
      }, HttpStatus.OK, requestId);
    }

    if (type === 'top_paths') {
      if (locals.user?.role !== 'admin') {
        return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const paths = await getTopConvertingPaths(limit);
      return apiResponse({
        success: true,
        data: paths
      }, HttpStatus.OK, requestId);
    }

    if (type === 'behavior_pattern') {
      if (!userId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'User ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      if (locals.user.role !== 'admin' && userId !== locals.user.id) {
        return apiError(ErrorCode.FORBIDDEN, 'Cannot access other users behavior data', HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const pattern = await analyzeBehaviorPattern(userId);
      return apiResponse({
        success: true,
        data: pattern
      }, HttpStatus.OK, requestId);
    }

    return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid journey type', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
  } catch (error) {
    logger.error('Failed to get journey data', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
