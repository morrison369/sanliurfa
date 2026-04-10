/**
 * Server-Sent Events endpoint for real-time social feed
 * Sends activity updates from followed users every 15 seconds
 */

import type { APIRoute } from 'astro';
import { queryOne, queryRows } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  logger.info('Real-time feed connection established', { userId: user.id });

  // SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  };

  let isClosed = false;
  let lastActivityId: string | null = null;

  const response = new Response(
    new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId: user.id })}\n\n`);

          // On first tick, establish baseline activity ID (no event sent)
          let isFirstTick = true;

          // Send feed updates every 15 seconds
          const interval = setInterval(async () => {
            if (isClosed) {
              clearInterval(interval);
              controller.close();
              return;
            }

            try {
              // First tick: just get the latest activity ID as baseline
              if (isFirstTick) {
                isFirstTick = false;
                const baselineResult = await queryOne(
                  `SELECT id FROM user_activity
                   INNER JOIN followers f ON user_activity.user_id = f.following_id
                   WHERE f.follower_id = $1
                   ORDER BY user_activity.created_at DESC LIMIT 1`,
                  [user.id]
                );
                if (baselineResult) {
                  lastActivityId = baselineResult.id;
                }
                return;
              }

              // Subsequent ticks: fetch new activities since cursor
              let query = `SELECT ua.id, ua.user_id, ua.action_type, ua.reference_type, ua.reference_id,
                                  ua.metadata, ua.created_at,
                                  u.full_name, u.username, u.avatar_url
                           FROM user_activity ua
                           INNER JOIN users u ON ua.user_id = u.id
                           INNER JOIN followers f ON ua.user_id = f.following_id
                           WHERE f.follower_id = $1
                             AND ua.created_at > NOW() - INTERVAL '1 hour'`;

              const params: any[] = [user.id];

              if (lastActivityId) {
                query += ` AND ua.id > $${params.length + 1}`;
                params.push(lastActivityId);
              }

              query += ` ORDER BY ua.created_at DESC LIMIT 10`;

              const activities = await queryRows(query, params);

              // Only emit event if there are new activities
              if (activities.length > 0) {
                // Update cursor to latest activity ID
                lastActivityId = activities[0].id;

                const data = {
                  type: 'feed_update',
                  timestamp: new Date().toISOString(),
                  activities: activities,
                  count: activities.length
                };

                controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
              }
            } catch (error) {
              logger.error('SSE feed heartbeat failed', error instanceof Error ? error : new Error(String(error)), {
                userId: user.id
              });
              const errorData = {
                type: 'error',
                message: 'Server error'
              };
              controller.enqueue(`data: ${JSON.stringify(errorData)}\n\n`);
            }
          }, 15000); // 15 second interval

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            isClosed = true;
            clearInterval(interval);
            controller.close();
            logger.info('Real-time feed connection closed', { userId: user.id });
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
