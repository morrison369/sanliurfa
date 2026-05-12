import type { APIRoute } from 'astro';
import { getRedisClient } from '../../../lib/cache';
import { logger } from '../../../lib/logging';

/**
 * Server-Sent Events endpoint for real-time online user count
 * Client connects via EventSource and receives updates every 30 seconds
 */
export const GET: APIRoute = async ({ request }) => {
  logger.info('Real-time presence connection established');

  // SSE headers — no CORS wildcard; same-origin SSE only (HARD RULE #34)
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  // Custom response body handler
  let isClosed = false;
  let interval: NodeJS.Timeout | null = null;

  const safeClose = (controller: ReadableStreamDefaultController) => {
    if (isClosed) return;
    isClosed = true;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    try {
      controller.close();
    } catch {
      // Stream may already be closed by runtime; ignore.
    }
  };

  const response = new Response(
    new ReadableStream({
      async start(controller) {
        try {
          const redis = await getRedisClient();

          // Send initial connection message
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

          // Send updates every 30 seconds
          interval = setInterval(async () => {
            if (isClosed) {
              safeClose(controller);
              return;
            }

            try {
              // Get online user count from Redis
              // You can implement this by maintaining a set of active sessions
              // For now, we'll calculate from active sessions
              const keys = await redis.keys('sanliurfa:session:*');
              const onlineCount = keys.length;

              // Get trending searches in last hour (top 5 by score, descending)
              const trendingSearches = await redis.zRange(
                'sanliurfa:trending:searches:1h',
                0, 4,
                { REV: true }
              );

              // Get active places (places with recent views, top 5 by score)
              const activePlaces = await redis.zRange(
                'sanliurfa:active:places:1h',
                0, 4,
                { REV: true }
              );

              const data = {
                type: 'update',
                timestamp: new Date().toISOString(),
                onlineUsers: onlineCount,
                trendingSearches: trendingSearches || [],
                activePlaces: activePlaces || []
              };

              if (!isClosed) {
                controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
              }
            } catch (error) {
              logger.error('SSE heartbeat failed', error instanceof Error ? error : new Error(String(error)));
              const errorData = {
                type: 'error',
                message: 'Server error'
              };
              if (!isClosed) {
                controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
              }
            }
          }, 30000); // 30 second interval

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            safeClose(controller);
            logger.info('Real-time presence connection closed');
          });
        } catch (error) {
          logger.error('SSE setup failed', error instanceof Error ? error : new Error(String(error)));
          safeClose(controller);
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
