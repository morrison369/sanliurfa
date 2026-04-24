/**
 * Admin - Notification stats
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const [totalResult, unreadResult, todayResult, subscriptionsResult] = await Promise.all([
      query('SELECT COUNT(*) FROM notifications', []),
      query("SELECT COUNT(*) FROM notifications WHERE read = false", []),
      query("SELECT COUNT(*) FROM notifications WHERE created_at >= NOW() - INTERVAL '1 day'", []),
      query('SELECT COUNT(*) FROM push_subscriptions WHERE is_active = true', []),
    ]);

    return apiResponse({
      total: parseInt(totalResult.rows[0].count),
      unread: parseInt(unreadResult.rows[0].count),
      sentToday: parseInt(todayResult.rows[0].count),
      activeSubscriptions: parseInt(subscriptionsResult.rows[0].count),
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Notification stats failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'İstatistikler alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
