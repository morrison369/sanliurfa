/**
 * Notifications API
 * GET: List notifications
 * POST: Mark as read
 * DELETE: Delete notification
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { problemJson } from '../../../lib/api';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../../../lib/notifications/sse';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş gerekli',
        type: '/problems/auth-required',
        instance: '/api/notifications',
      });
    }

    const searchParams = new URL(url).searchParams;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(auth.user.id, { limit, unreadOnly }),
      getUnreadCount(auth.user.id),
    ]);

    return new Response(
      JSON.stringify({ notifications, unreadCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Bildirimler Alınamadı',
      detail: error instanceof Error ? error.message : 'Failed to get notifications',
      type: '/problems/notifications-fetch-failed',
      instance: '/api/notifications',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş gerekli',
        type: '/problems/auth-required',
        instance: '/api/notifications',
      });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await markAllAsRead(auth.user.id);
    } else if (notificationId) {
      await markAsRead(notificationId, auth.user.id);
    } else {
      return problemJson({
        status: 400,
        title: 'Eksik Parametre',
        detail: 'notificationId veya markAll zorunlu',
        type: '/problems/notifications-mark-validation',
        instance: '/api/notifications',
      });
    }

    // Get updated unread count
    const unreadCount = await getUnreadCount(auth.user.id);

    return new Response(
      JSON.stringify({ success: true, unreadCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Bildirim Güncellenemedi',
      detail: error instanceof Error ? error.message : 'Failed to mark as read',
      type: '/problems/notifications-mark-failed',
      instance: '/api/notifications',
    });
  }
};
