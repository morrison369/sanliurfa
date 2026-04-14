// @ts-nocheck
import type { APIRoute } from 'astro';
import { registerSSE, getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../../../lib/notifications/realtime-notifications';

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
      // Client disconnected
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
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const data = await request.json();
    const { action, notificationId } = data;

    switch (action) {
      case 'mark-read':
        if (notificationId) {
          markAsRead(userId, notificationId);
        }
        break;
      
      case 'mark-all-read':
        markAllAsRead(userId);
        break;
      
      case 'delete':
        if (notificationId) {
          deleteNotification(userId, notificationId);
        }
        break;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
