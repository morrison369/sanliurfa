/**
 * SSE Endpoint for Real-time Notifications
 * GET /api/notifications/sse
 */

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { createSSEStream } from '../../../lib/notifications/sse';

export const GET: APIRoute = async ({ request }) => {
  // Authenticate user
  const auth = await requireAuth(request);
  if (auth instanceof Response) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = auth.user.id;

  // Create SSE stream
  const stream = createSSEStream(userId);

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
};
