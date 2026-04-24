/**
 * Admin - Send push notification
 * POST: Broadcast or targeted push notification
 */

import type { APIRoute } from 'astro';
import { queryMany, insert } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';
import { sendPushToUser } from '../../../lib/push/push';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { title, message, url, target, userIds, segment } = body;

    if (!title || !message) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık ve mesaj zorunludur', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Determine recipients
    let recipientIds: string[] = [];
    if (target === 'all') {
      const users = await queryMany(`SELECT id FROM users WHERE status = 'active' LIMIT 10000`, []);
      recipientIds = users.map((u: any) => u.id);
    } else if (target === 'specific' && Array.isArray(userIds)) {
      recipientIds = userIds;
    } else if (target === 'segment' && segment) {
      const users = await queryMany(`SELECT id FROM users WHERE subscription_tier = $1 AND status = 'active'`, [segment]);
      recipientIds = users.map((u: any) => u.id);
    } else {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz hedef', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Log the notification broadcast
    const notifId = crypto.randomUUID();
    await insert('notification_broadcasts', {
      id: notifId,
      title,
      message,
      url: url || null,
      target,
      recipient_count: recipientIds.length,
      sent_by: locals.user?.id,
      created_at: new Date().toISOString(),
    }).catch(() => null); // non-fatal if table doesn't exist yet

    // Send push to each recipient's subscriptions
    let sent = 0;
    for (const userId of recipientIds) {
      try {
        await sendPushToUser(userId, { title, body: message, data: { url } });
        sent++;
      } catch {
        // Individual failures don't abort the broadcast
      }
    }

    logger.info('Notification broadcast sent', { notifId, target, sent, total: recipientIds.length });

    return apiResponse({ sent, total: recipientIds.length }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Notification send failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Bildirim gönderilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
