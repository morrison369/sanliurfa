import type { APIRoute } from 'astro';
import { listFlags, updateFlag, deleteFlag, createFlag, getFlagStats } from '../../../lib/feature-flags/feature-flags';

// GET: List all flags (admin only)
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  const [flags, stats] = await Promise.all([listFlags(), getFlagStats()]);
  return new Response(
    JSON.stringify({ flags, stats }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// POST: Create flag (admin only)
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const { key, name, type, value } = await request.json();
    if (!key || !name || !type) {
      return new Response(JSON.stringify({ error: 'key, name, type zorunludur' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const flag = await createFlag(key, name, type, value ?? false);
    return new Response(JSON.stringify({ success: true, flag }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
};

// PUT: Update flag (admin only)
export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const { key, ...updates } = await request.json();
    const updated = await updateFlag(key, updates);
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Flag not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: true, flag: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
};

// DELETE: Delete flag (admin only)
export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const { key } = await request.json();
    const deleted = await deleteFlag(key);
    return new Response(JSON.stringify({ success: deleted }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
};
