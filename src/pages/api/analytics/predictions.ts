/**
 * Predictive Analytics Endpoint
 * Get ML predictions, churn risk, LTV, recommendations
 */

import type { APIRoute } from 'astro';
import { predictUserChurn, calculateLifetimeValue, getHighRiskUsers, getRecommendations, getModelPerformanceMetrics } from '../../../lib/predictive-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin && !locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const type = url.searchParams.get('type') || 'churn';
    const userId = url.searchParams.get('user_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (type === 'churn') {
      if (!userId) {
        // Admin can get high risk users
        if (!locals.isAdmin) {
          return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
        }
        const users = await getHighRiskUsers(limit);
        return apiResponse({
          success: true,
          data: users
        }, HttpStatus.OK, requestId);
      }

      // User can only get their own predictions
      if (!locals.isAdmin && userId !== locals.user.id) {
        return apiError(ErrorCode.FORBIDDEN, 'Cannot access other users predictions', HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const prediction = await predictUserChurn(userId);
      return apiResponse({
        success: true,
        data: prediction
      }, HttpStatus.OK, requestId);
    }

    if (type === 'ltv') {
      if (!userId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'User ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      const ltv = await calculateLifetimeValue(userId);
      return apiResponse({
        success: true,
        data: { user_id: userId, lifetime_value: ltv }
      }, HttpStatus.OK, requestId);
    }

    if (type === 'recommendations') {
      if (!userId) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'User ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }

      const recommendations = await getRecommendations(userId);
      return apiResponse({
        success: true,
        data: recommendations
      }, HttpStatus.OK, requestId);
    }

    if (type === 'model_performance') {
      if (!locals.isAdmin) {
        return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const metrics = await getModelPerformanceMetrics();
      return apiResponse({
        success: true,
        data: metrics
      }, HttpStatus.OK, requestId);
    }

    return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid prediction type', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
  } catch (error) {
    logger.error('Failed to get predictions', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
