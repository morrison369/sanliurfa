import type { APIRoute } from 'astro';
import { getRedisClient } from '../../../lib/cache';
import { logger } from '../../../lib/logging';

/**
 * Server-Sent Events endpoint for real-time online user count
 * Client connects via EventSource and receives updates every 30 seconds
 */
export const GET: APIRoute = async ({ request }) => {
  logger.info('Real-time presence connection established');

  // SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  };

  // Custom response body handler
  let isClosed = false;

  const response = new Response(
    new ReadableStream({
      async start(controller) {
        try {
          const redis = await getRedisClient();

          // Send initial connection message
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

          // Send updates every 30 seconds
          const interval = setInterval(async () => {
            if (isClosed) {
              clearInterval(interval);
              controller.close();
              return;
            }

            try {
              // Get online user count from Redis
              // You can implement this by maintaining a set of active sessions
              // For now, we'll calculate from active sessions
              const keys = await redis.keys('sanliurfa:session:*');
              const onlineCount = keys.length;

              // Get trending searches in last hour
              const trendingSearches = await redis.zRevRangeByScore(
                'sanliurfa:trending:searches:1h',
                '+inf',
                '-inf',
                { LIMIT: { offset: 0, count: 5 } }
              );

              // Get active places (places with recent views)
              const activePlaces = await redis.zRevRangeByScore(
                'sanliurfa:active:places:1h',
                '+inf',
                '-inf',
                { LIMIT: { offset: 0, count: 5 } }
              );

              const data = {
                type: 'update',
                timestamp: new Date().toISOString(),
                onlineUsers: onlineCount,
                trendingSearches: trendingSearches || [],
                activePlaces: activePlaces || []
              };

              controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
              logger.error('SSE heartbeat failed', error instanceof Error ? error : new Error(String(error)));
              const errorData = {
                type: 'error',
                message: 'Server error'
              };
              controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
            }
          }, 30000); // 30 second interval

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            isClosed = true;
            clearInterval(interval);
            controller.close();
            logger.info('Real-time presence connection closed');
          });
        } catch (error) {
          logger.error('SSE setup failed', error instanceof Error ? error : new Error(String(error)));
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
