// @ts-nocheck
/**
 * User Journey Analytics Endpoint
 * Track and analyze user paths
 */

import type { APIRoute } from 'astro';
import { getUserJourneys, getJourneyDetails, getTopConvertingPaths, analyzeBehaviorPattern } from '../../../lib/journey-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin && !locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const type = url.searchParams.get('type') || 'journeys';
    const userId = url.searchParams.get('user_id');
    const journeyId = url.searchParams.get('journey_id');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (type === 'journeys') {
      if (!userId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'Kullanıcı ID gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      // User can only access their own journeys
      if (!locals.isAdmin && userId !== locals.user.id) {
        return apiError(ErrorCode.FORBIDDEN, 'Başka kullanıcıların yolculuk verilerine erişemezsiniz', HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const journeys = await getUserJourneys(userId, limit);
      return apiResponse({
        success: true,
        data: journeys
      }, HttpStatus.OK, requestId);
    }

    if (type === 'journey_details') {
      if (!journeyId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'Yolculuk ID gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      const details = await getJourneyDetails(journeyId);
      if (!details) {
        return apiError(ErrorCode.NOT_FOUND, 'Yolculuk bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
      }

      return apiResponse({
        success: true,
        data: details
      }, HttpStatus.OK, requestId);
    }

    if (type === 'top_paths') {
      if (!locals.isAdmin) {
        return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const paths = await getTopConvertingPaths(limit);
      return apiResponse({
        success: true,
        data: paths
      }, HttpStatus.OK, requestId);
    }

    if (type === 'behavior_pattern') {
      if (!userId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'Kullanıcı ID gereklidir', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      const pattern = await analyzeBehaviorPattern(userId);
      return apiResponse({
        success: true,
        data: pattern
      }, HttpStatus.OK, requestId);
    }

    return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz yolculuk türü', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
  } catch (error) {
    logger.error('Failed to get journey data', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Yolculuk verileri alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
