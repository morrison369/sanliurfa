import type { APIRoute } from 'astro';
import { registerSSE, unregisterSSE, markAsRead, markAllAsRead, deleteNotification } from '../../../lib/notifications/realtime-notifications';
import { problemJson } from '../../../lib/api';

export const GET: APIRoute = async ({ request, locals }) => {
  const userId = locals.user?.id || 'anonymous';
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Register client
      registerSSE(userId, controller);
      
      // Send keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(':keepalive\n\n'));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        controller.close();
      });
    },
    cancel() {
      unregisterSSE(userId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};

// POST to manage notifications
export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.user?.id;
  
  if (!userId) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Oturum açmanız gerekiyor',
      type: '/problems/sse-notifications-unauthorized',
      instance: '/api/sse/notifications',
    });
  }

  try {
    const data = await request.json();
    const { action, notificationId } = data;

    switch (action) {
      case 'mark-read':
        if (notificationId) {
          await markAsRead(userId, notificationId);
        }
        break;

      case 'mark-all-read':
        await markAllAsRead(userId);
        break;

      case 'delete':
        if (notificationId) {
          await deleteNotification(userId, notificationId);
        }
        break;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Invalid request',
      type: '/problems/sse-notifications-invalid-request',
      instance: '/api/sse/notifications',
    });
  }
};
