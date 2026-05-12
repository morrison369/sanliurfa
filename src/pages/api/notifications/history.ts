/**
 * Admin - Notification broadcast history
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logger';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 200);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);

    // Try notification_broadcasts table; fall back to notifications table if missing
    const history = await (async () => {
      try {
        return await query(
          `SELECT nb.*, u.full_name as sender_name
           FROM notification_broadcasts nb
           LEFT JOIN users u ON u.id = nb.sent_by
           ORDER BY nb.created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
      } catch {
        // Fallback: recent system notifications from notifications table
        return await query(
          `SELECT id, title, message, created_at, type
           FROM notifications
           WHERE user_id IS NULL OR type = 'broadcast'
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
      }
    })();

    return apiResponse({ history: history.rows, limit, offset }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Notification history failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Geçmiş alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
