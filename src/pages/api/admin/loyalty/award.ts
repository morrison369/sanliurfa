/**
 * Admin Loyalty Award API
 * Manually award points or badges to users
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { awardPoints } from '../../../../lib/loyalty-points';
import { awardBadgeToUser } from '../../../../lib/badges';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { deleteCache } from '../../../../lib/cache';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin guard
    if (!locals.user || locals.user.role !== 'admin') {
      recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Parse body
    const body = await request.json();
    const { userId, type, amount, badgeKey, reason } = body;

    // Validation
    if (!userId || !type || !reason) {
      recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'userId, type, and reason are required',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (!['points', 'badge'].includes(type)) {
      recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'type must be "points" or "badge"',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Verify user exists
    const userExists = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!userExists) {
      recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'User not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    let awarded: string | number;

    if (type === 'points') {
      // Award points
      if (amount === undefined || typeof amount !== 'number' || amount < 1) {
        recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'amount is required and must be a positive number',
          HttpStatus.UNPROCESSABLE_ENTITY,
          undefined,
          requestId
        );
      }

      await awardPoints(userId, amount, reason);
      awarded = amount;

      // Invalidate user points cache
      await deleteCache(`sanliurfa:loyalty:balance:${userId}`);
      await deleteCache(`sanliurfa:tier:user:${userId}`);
    } else {
      // Award badge
      if (!badgeKey) {
        recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'badgeKey is required for badge type',
          HttpStatus.UNPROCESSABLE_ENTITY,
          undefined,
          requestId
        );
      }

      const success = await awardBadgeToUser(userId, badgeKey, reason);
      if (!success) {
        recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.CONFLICT, Date.now() - startTime);
        return apiError(
          ErrorCode.CONFLICT,
          'User already has this badge',
          HttpStatus.CONFLICT,
          undefined,
          requestId
        );
      }

      awarded = badgeKey;
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.OK, duration);
    logger.logMutation(
      'admin_award',
      type === 'points' ? 'loyalty_points' : 'user_badges',
      userId,
      locals.user.id,
      { type, awarded, reason }
    );

    return apiResponse(
      { success: true, data: { userId, type, awarded, reason } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to award loyalty item',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to award item',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
