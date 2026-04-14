/**
 * Notifications API
 * GET: List notifications
 * POST: Mark as read
 * DELETE: Delete notification
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../../../lib/notifications/sse';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get notifications' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await markAllAsRead(auth.user.id);
    } else if (notificationId) {
      await markAsRead(notificationId, auth.user.id);
    } else {
      return new Response(
        JSON.stringify({ error: 'notificationId or markAll required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get updated unread count
    const unreadCount = await getUnreadCount(auth.user.id);

    return new Response(
      JSON.stringify({ success: true, unreadCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to mark as read' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
