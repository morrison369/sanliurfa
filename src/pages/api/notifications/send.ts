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
    if (locals.user?.role !== 'admin') {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { title, message, url, target, userIds, segment } = body;

    if (!title || !message) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık ve mesaj zorunludur', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (typeof title !== 'string' || title.length > 200) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık 200 karakteri aşamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (typeof message !== 'string' || message.length > 5000) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Mesaj 5000 karakteri aşamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (url !== undefined && url !== null && (typeof url !== 'string' || url.length > 2000)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'URL 2000 karakteri aşamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Determine recipients
    let recipientIds: string[] = [];
    if (target === 'all') {
      // Offset pagination — avoids hard cap on large user bases
      const FETCH_SIZE = 1000;
      let offset = 0;
      while (true) {
        const batch = await queryMany(
          `SELECT id FROM users WHERE status = 'active' ORDER BY id LIMIT $1 OFFSET $2`,
          [FETCH_SIZE, offset]
        );
        recipientIds.push(...batch.map((u: any) => u.id));
        if (batch.length < FETCH_SIZE) break;
        offset += FETCH_SIZE;
      }
    } else if (target === 'specific' && Array.isArray(userIds)) {
      if (userIds.length > 500) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'userIds dizisi 500 öğeyi aşamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }
      recipientIds = userIds;
    } else if (target === 'segment' && segment) {
      if (typeof segment !== 'string' || segment.length > 100) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'segment 100 karakteri aşamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }
      const users = await queryMany(`SELECT id FROM users WHERE subscription_tier = $1 AND status = 'active'`, [segment]);
      recipientIds = users.map((u) => u.id);
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

    // Send push to each recipient — chunked to avoid overwhelming the push service
    const CHUNK_SIZE = 100;
    let sent = 0;
    for (let i = 0; i < recipientIds.length; i += CHUNK_SIZE) {
      const chunk = recipientIds.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map(userId => sendPushToUser(userId, { title, body: message, data: { url } }))
      );
      sent += results.filter(r => r.status === 'fulfilled').length;
    }

    logger.info('Notification broadcast sent', { notifId, target, sent, total: recipientIds.length });

    return apiResponse({ sent, total: recipientIds.length }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Notification send failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Bildirim gönderilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
