/**
 * Admin: Manual Points/Badge Award
 * POST - Award points or badge to any user
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { awardPoints } from '../../../../lib/loyalty-points';
import { deleteCache, deleteCachePattern } from '../../../../lib/cache';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

// Assume badges module exists with awardBadgeToUser function
// Import will need to be added based on actual badges.ts location
import { awardBadgeToUser } from '../../../../lib/badges';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/loyalty/award',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('POST', '/api/admin/loyalty/award', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('POST', '/api/admin/loyalty/award', response.status, duration);
        },
      },
      async () => {
        const body = await request.json();
        const { userId, type, amount, badgeKey, reason } = body;

        if (!userId || !type || !reason) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'userId, type, and reason are required',
            HttpStatus.UNPROCESSABLE_ENTITY,
            undefined,
            requestId
          );
        }

        const user = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
        if (!user) {
          return apiError(
            ErrorCode.NOT_FOUND,
            'User not found',
            HttpStatus.NOT_FOUND,
            undefined,
            requestId
          );
        }

        let awarded = false;
        const data: Record<string, unknown> = { userId, type, reason };

        if (type === 'points') {
          if (typeof amount !== 'number' || amount <= 0) {
            return apiError(
              ErrorCode.VALIDATION_ERROR,
              'amount is required and must be > 0',
              HttpStatus.UNPROCESSABLE_ENTITY,
              undefined,
              requestId
            );
          }

          const success = await awardPoints(userId, amount, reason, 'admin_award', requestId);
          if (success) {
            awarded = true;
            data.awarded = amount;
            await deleteCache(`sanliurfa:loyalty:balance:${userId}`);
            await deleteCachePattern(`sanliurfa:tier:user:${userId}`);
          }
        } else if (type === 'badge') {
          if (!badgeKey) {
            return apiError(
              ErrorCode.VALIDATION_ERROR,
              'badgeKey is required for badge awards',
              HttpStatus.UNPROCESSABLE_ENTITY,
              undefined,
              requestId
            );
          }

          const success = await awardBadgeToUser(userId, badgeKey, reason);
          if (success === false) {
            return apiError(
              ErrorCode.CONFLICT,
              'Badge already awarded to this user',
              HttpStatus.CONFLICT,
              undefined,
              requestId
            );
          }

          awarded = true;
          data.awarded = badgeKey;
        } else {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'type must be "points" or "badge"',
            HttpStatus.UNPROCESSABLE_ENTITY,
            undefined,
            requestId
          );
        }

        logger.info('Award granted', { userId, type, reason, admin: locals.user?.id });
        return apiResponse({ success: awarded, data }, HttpStatus.OK, requestId);
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/award', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to award', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to award',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
