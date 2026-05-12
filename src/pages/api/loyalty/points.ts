/**
 * API: Loyalty Points
 * GET - User's loyalty points and balance
 * POST - Award points (admin only)
 */
import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { getUserPoints } from '../../../lib/loyalty/loyalty-points';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin only
    if (locals.user?.role !== 'admin') {
      recordRequest('POST', '/api/loyalty/points', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { userId, points, reason } = body;

    if (!userId || typeof points !== 'number' || points <= 0 || !Number.isFinite(points)) {
      recordRequest('POST', '/api/loyalty/points', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid input', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
      recordRequest('POST', '/api/loyalty/points', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'reason 500 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Atomic increment — prevents race condition from concurrent award requests
    const result = await queryOne<{ current_balance: number }>(
      `UPDATE loyalty_points
       SET current_balance = current_balance + $1,
           lifetime_earned = COALESCE(lifetime_earned, 0) + $1,
           last_earned_at = NOW()
       WHERE user_id = $2
       RETURNING current_balance`,
      [points, userId]
    );

    if (!result) {
      recordRequest('POST', '/api/loyalty/points', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const newBalance = result.current_balance;

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
