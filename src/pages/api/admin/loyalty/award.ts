/**
 * Admin: Manual Points/Badge Award
 * POST - Award points or badge to any user
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { awardPoints } from '../../../../lib/loyalty-points';
import { deleteCache, deleteCachePattern } from '../../../../lib/cache';
import { apiResponse, apiError } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

// Assume badges module exists with awardBadgeToUser function
// Import will need to be added based on actual badges.ts location
import { awardBadgeToUser } from '../../../../lib/badges';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Admin only
    if (!locals.user || locals.user.role !== 'admin') {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/admin/loyalty/award', 403, duration);
      return apiError('FORBIDDEN', 'Admin access required', 403, undefined, requestId);
    }

    const body = await request.json();
    const { userId, type, amount, badgeKey, reason } = body;

    // Validation
    if (!userId || !type || !reason) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/admin/loyalty/award', 422, duration);
      return apiError('VALIDATION_ERROR', 'userId, type, and reason are required', 422, undefined, requestId);
    }

    // Verify user exists
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/admin/loyalty/award', 404, duration);
      return apiError('NOT_FOUND', 'User not found', 404, undefined, requestId);
    }

    let awarded = false;
    let data: any = { userId, type, reason };

    if (type === 'points') {
      if (typeof amount !== 'number' || amount <= 0) {
        const duration = Date.now() - startTime;
        recordRequest('POST', '/api/admin/loyalty/award', 422, duration);
        return apiError('VALIDATION_ERROR', 'amount is required and must be > 0', 422, undefined, requestId);
      }

      const success = await awardPoints(userId, amount, reason, 'admin_award', requestId);
      if (success) {
        awarded = true;
        data.awarded = amount;
        
        // Invalidate user's points caches
        await deleteCache(`sanliurfa:loyalty:balance:${userId}`);
        await deleteCachePattern(`sanliurfa:tier:user:${userId}`);
      }
    } else if (type === 'badge') {
      if (!badgeKey) {
        const duration = Date.now() - startTime;
        recordRequest('POST', '/api/admin/loyalty/award', 422, duration);
        return apiError('VALIDATION_ERROR', 'badgeKey is required for badge awards', 422, undefined, requestId);
      }

      const success = await awardBadgeToUser(userId, badgeKey, reason);
      if (success === false) {
        // Badge already awarded
        const duration = Date.now() - startTime;
        recordRequest('POST', '/api/admin/loyalty/award', 409, duration);
        return apiError('CONFLICT', 'Badge already awarded to this user', 409, undefined, requestId);
      }

      awarded = true;
      data.awarded = badgeKey;
    } else {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/admin/loyalty/award', 422, duration);
      return apiError('VALIDATION_ERROR', 'type must be "points" or "badge"', 422, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/award', 200, duration);

    logger.info('Award granted', { userId, type, reason, admin: locals.user.id });

    return apiResponse({ success: awarded, data }, 200, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/loyalty/award', 500, duration);
    logger.error('Failed to award', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to award', 500, undefined, requestId);
  }
};
