import type { APIRoute } from 'astro';
import { requireAuth } from '../../../../lib/auth';
import { problemJson, safeErrorDetail } from '../../../../lib/api';
import {
  getConversationTypingUsers,
  getTotalUnreadCount,
  getUserConversations,
} from '../../../../lib/social/messaging-db';
import { subscribeMessageEvents } from '../../../../lib/social/message-events';

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAuth(request).catch(() => null);
  if (!auth?.user) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Giriş gerekli',
      type: '/problems/auth-required',
      instance: '/api/social/messages/stream',
    });
  }

  const userId = auth.user.id;
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const pushSync = async (activeConversationId?: string) => {
        if (closed) return;
        try {
          const [unreadCount, conversations] = await Promise.all([
            getTotalUnreadCount(userId),
            getUserConversations(userId),
          ]);
          controller.enqueue(
            new TextEncoder().encode(
              sseEncode('sync', {
                unreadCount,
                conversationCount: conversations.length,
                activeConversationId: activeConversationId || null,
                typingUsers: activeConversationId
                  ? getConversationTypingUsers(activeConversationId, userId)
                  : [],
                checkedAt: new Date().toISOString(),
              }),
            ),
          );
        } catch (error) {
          controller.enqueue(
            new TextEncoder().encode(
              sseEncode('error', {
                message: safeErrorDetail(error, 'stream_sync_failed'),
              }),
            ),
          );
        }
      };
      const unsubscribe = await subscribeMessageEvents(async (event) => {
        await pushSync(event.conversationId);
      });
      const heartbeat = setInterval(async () => {
        await pushSync();
      }, 30000);

      controller.enqueue(new TextEncoder().encode(sseEncode('ready', { ok: true })));
      await pushSync();
      setTimeout(() => {
        clearInterval(heartbeat);
        unsubscribe();
        if (!closed) {
          controller.close();
          closed = true;
        }
      }, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
    },
  });
};
