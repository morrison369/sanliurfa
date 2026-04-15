/**
 * Client Error Reporting
 * POST: Log JavaScript errors from the browser
 */

import type { APIRoute } from 'astro';
import { insert } from '../../../lib/postgres';
import { logger } from '../../../lib/logger';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { message, stack, url, line, column, userAgent, context } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

    await insert('client_errors', {
      message: String(message).slice(0, 500),
      stack: stack ? String(stack).slice(0, 2000) : null,
      page_url: url ? String(url).slice(0, 500) : null,
      line_number: line || null,
      column_number: column || null,
      user_agent: userAgent ? String(userAgent).slice(0, 255) : request.headers.get('user-agent')?.slice(0, 255) || null,
      user_id: locals.user?.id || null,
      ip_address: ip,
      context: context ? JSON.stringify(context) : null,
      created_at: new Date().toISOString(),
    }).catch(() => null); // best-effort, table may not exist

    logger.warn('Client error reported', Object.assign(new Error(String(message).slice(0, 200)), { url, userId: locals.user?.id }));

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    // Never fail on error reporting
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
};
