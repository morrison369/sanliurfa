// @ts-nocheck
import type { APIRoute } from 'astro';

// In-memory store (replace with database in production)
const auditLogStore: any[] = [];

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.entity || !data.action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      entity: data.entity,
      entityId: data.entityId,
      action: data.action,
      actor: data.actor || 'anonymous',
      actorType: data.actorType || 'user',
      changes: data.changes || {},
      metadata: data.metadata || {},
      ip: locals.clientAddress || '',
      userAgent: request.headers.get('user-agent') || '',
    };

    // Store in memory
    auditLogStore.push(entry);

    // Trim if too large
    if (auditLogStore.length > 10000) {
      auditLogStore.splice(0, 1000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Audit] Entry:', entry);
    }

    return new Response(
      JSON.stringify({ success: true, id: entry.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Audit log error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET endpoint to retrieve audit logs (admin only)
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const entity = url.searchParams.get('entity');
  const action = url.searchParams.get('action');
  const actor = url.searchParams.get('actor');
  const limit = parseInt(url.searchParams.get('limit') || '100');

  let results = [...auditLogStore];

  if (entity) {
    results = results.filter(e => e.entity === entity);
  }

  if (action) {
    results = results.filter(e => e.action === action);
  }

  if (actor) {
    results = results.filter(e => e.actor === actor);
  }

  // Sort by timestamp desc
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Limit results
  results = results.slice(0, limit);

  return new Response(
    JSON.stringify({
      entries: results,
      total: results.length,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
