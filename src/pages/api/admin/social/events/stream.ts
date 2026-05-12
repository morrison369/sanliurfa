import type { APIRoute } from 'astro';
import { authenticateUser } from '../../../../../lib/auth/middleware';
import { query } from '../../../../../lib/postgres';
import { problemJson } from '../../../../../lib/api';

function sseEncode(event: string, data: unknown, eventId?: string): string {
  const idLine = eventId ? `id: ${eventId}\n` : '';
  return `${idLine}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString('base64url');
}

function decodeCursor(cursor: string | null): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [createdAt, id] = decoded.split('|');
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export const GET: APIRoute = async (context) => {
  const auth = await authenticateUser(context);
  if (!auth || auth.user.role !== 'admin') {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-social-events-stream-unauthorized',
      instance: '/api/admin/social/events/stream',
    });
  }

  const url = new URL(context.request.url);
  const tenantId = String(url.searchParams.get('tenantId') || '').trim();
  const replayToken =
    decodeCursor(url.searchParams.get('cursor')) ||
    decodeCursor(context.request.headers.get('last-event-id'));
  const replaySince = String(url.searchParams.get('since') || '').trim();

  let cleanup: (() => void) | null = null;
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let cursor = replayToken ? replayToken.createdAt : replaySince;
      let cursorId = replayToken ? replayToken.id : '';
      const encoder = new TextEncoder();

      const sendDiff = async () => {
        if (closed) return;
        try {
          const params: unknown[] = [];
          let whereSql = '';
          if (tenantId) {
            params.push(tenantId);
            whereSql = `tenant_id = $${params.length}`;
          }
          if (cursor && cursorId) {
            params.push(cursor);
            params.push(cursorId);
            whereSql = `${whereSql ? `${whereSql} AND ` : ''}(created_at, id) > ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
          } else if (cursor) {
            params.push(cursor);
            whereSql = `${whereSql ? `${whereSql} AND ` : ''}created_at > $${params.length}::timestamptz`;
          }
          const where = whereSql ? `WHERE ${whereSql}` : '';
          const result = await query(
            `SELECT id, event_type, actor_user_id, target_user_id, conversation_id, metadata, created_at
             FROM social_event_store
             ${where}
             ORDER BY created_at ASC
             LIMIT 100`,
            params,
          );
          if (!result.rows.length) return;
          const last = result.rows[result.rows.length - 1];
          cursor = String(last.created_at ?? '');
          cursorId = String(last.id ?? '');
          const nextToken = encodeCursor(cursor, cursorId);
          controller.enqueue(encoder.encode(sseEncode('social-events', result.rows, nextToken)));
        } catch {
          controller.enqueue(encoder.encode(sseEncode('social-events-error', { ok: false })));
        }
      };

      const interval = setInterval(() => {
        void sendDiff();
      }, 10000);

      const closeStream = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // noop
        }
      };
      cleanup = closeStream;

      controller.enqueue(encoder.encode(sseEncode('ready', { ok: true })));
      await sendDiff();
      setTimeout(closeStream, 10 * 60 * 1000);
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
