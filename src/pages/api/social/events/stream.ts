import type { APIRoute } from 'astro';
import { requireAuth } from '../../../../lib/auth';
import { problemJson } from '../../../../lib/api';
import { subscribeSocialEvents } from '../../../../lib/social/event-stream';

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
      instance: '/api/social/events/stream',
    });
  }

  const userId = auth.user.id;
  let cleanup: (() => void) | null = null;
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const encoder = new TextEncoder();
      const unsubscribe = await subscribeSocialEvents((event) => {
        if (event.actorUserId !== userId && event.targetUserId !== userId) return;
        if (closed) return;
        controller.enqueue(encoder.encode(sseEncode('social-event', event)));
      });

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(':keepalive\n\n'));
      }, 30000);

      const closeStream = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // noop: already closed by client/runtime
        }
      };
      cleanup = closeStream;

      controller.enqueue(encoder.encode(sseEncode('ready', { ok: true })));
      setTimeout(closeStream, 5 * 60 * 1000);
    },
    cancel() {
      cleanup?.();
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
