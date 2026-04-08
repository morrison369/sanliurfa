/**
 * API: Loyalty Points
 * GET - User's loyalty points and balance
 * POST - Award points (admin only)
 */
import type { APIRoute } from 'astro';
import { queryOne, update } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { getUserPoints, expirePoints } from '../../../lib/loyalty-points';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/loyalty/points', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const points = await getUserPoints(locals.user.id);
    const duration = Date.now() - startTime;

    recordRequest('GET', '/api/loyalty/points', HttpStatus.OK, duration);
    return apiResponse({ success: true, data: points }, HttpStatus.OK, requestId);
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/points', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get loyalty points', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin only
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/loyalty/points', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { userId, points, reason } = body;

    if (!userId || typeof points !== 'number' || points <= 0) {
      recordRequest('POST', '/api/loyalty/points', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid input', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const userPoints = await queryOne(
      'SELECT current_balance FROM loyalty_points WHERE user_id = $1',
      [userId]
    );

    if (!userPoints) {
      recordRequest('POST', '/api/loyalty/points', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const newBalance = userPoints.current_balance + points;
    await update(
      'loyalty_points',
      { user_id: userId },
      {
        current_balance: newBalance,
        lifetime_earned: (userPoints.lifetime_earned || 0) + points,
        last_earned_at: new Date()
      }
    );

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/points', HttpStatus.OK, duration);
    logger.logMutation('award_points', 'loyalty_points', userId, locals.user?.id, { points, reason });

    return apiResponse(
      {
        success: true,
        data: {
          userId,
          awarded: points,
          newBalance,
          reason
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/loyalty/points', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to award points', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
