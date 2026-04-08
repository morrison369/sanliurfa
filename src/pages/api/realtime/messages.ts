/**
 * Server-Sent Events endpoint for real-time messaging updates
 * Sends unread message count updates to connected clients
 * Client connects via EventSource and receives updates every 5 seconds
 */

import type { APIRoute } from 'astro';
import { getUnreadCount } from '../../../lib/messages';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  logger.info('Real-time messaging connection established', { userId: user.id });

  // SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  };

  let isClosed = false;

  const response = new Response(
    new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId: user.id })}\n\n`);

          // Send updates every 5 seconds
          const interval = setInterval(async () => {
            if (isClosed) {
              clearInterval(interval);
              controller.close();
              return;
            }

            try {
              // Get current unread count
              const unreadCount = await getUnreadCount(user.id);

              const data = {
                type: 'update',
                timestamp: new Date().toISOString(),
                unreadCount: unreadCount
              };

              controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
              logger.error('SSE heartbeat failed', error instanceof Error ? error : new Error(String(error)), {
                userId: user.id
              });
              const errorData = {
                type: 'error',
                message: 'Server error'
              };
              controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
            }
          }, 5000); // 5 second interval

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            isClosed = true;
            clearInterval(interval);
            controller.close();
            logger.info('Real-time messaging connection closed', { userId: user.id });
          });
        } catch (error) {
          logger.error('SSE setup failed', error instanceof Error ? error : new Error(String(error)), {
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
