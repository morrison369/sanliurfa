/**
 * Server-Sent Events endpoint for real-time notifications
 * Sends notification updates to connected authenticated users
 * Client connects via EventSource and receives updates every 10 seconds
 */

import type { APIRoute } from 'astro';
import { queryRows } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  logger.info('Real-time notifications connection established', { userId: user.id });

  // SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  };

  let isClosed = false;
  let lastNotificationId = '';

  const response = new Response(
    new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId: user.id })}\n\n`);

          // Send updates every 10 seconds
          const interval = setInterval(async () => {
            if (isClosed) {
              clearInterval(interval);
              controller.close();
              return;
            }

            try {
              // Get unread notifications for user
              const notifications = await queryRows(
                `SELECT id, user_id, title, message, type, data, is_read, created_at
                 FROM notifications
                 WHERE user_id = $1 AND is_read = false
                 ORDER BY created_at DESC
                 LIMIT 10`,
                [user.id]
              );

              // Only send if there are new notifications
              if (notifications.length > 0) {
                const data = {
                  type: 'update',
                  timestamp: new Date().toISOString(),
                  notificationCount: notifications.length,
                  notifications: notifications.map(n => ({
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    notificationType: n.type,
                    createdAt: n.created_at
                  }))
                };

                controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
              }
            } catch (error) {
              logger.error('SSE notification heartbeat failed', error instanceof Error ? error : new Error(String(error)), {
                userId: user.id
              });
              const errorData = {
                type: 'error',
                message: 'Server error'
              };
              controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
            }
          }, 10000); // 10 second interval

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            isClosed = true;
            clearInterval(interval);
            controller.close();
            logger.info('Real-time notifications connection closed', { userId: user.id });
          });
        } catch (error) {
          logger.error('SSE notifications setup failed', error instanceof Error ? error : new Error(String(error)), {
            userId: user.id
          });
          controller.close();
        }
      }
    }),
    {
      headers,
      status: 200
    }
  );

  return response;
};
