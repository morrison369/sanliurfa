// @ts-nocheck
import type { APIRoute } from 'astro';
import { listFlags, updateFlag, deleteFlag, createFlag, getFlagStats } from '../../../lib/feature-flags/feature-flags';

// GET: List all flags (admin only)
export const GET: APIRoute = async () => {
  const flags = listFlags();
  const stats = getFlagStats();
  
  return new Response(
    JSON.stringify({ flags, stats }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// PUT: Update flag (admin only)
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { key, ...updates } = await request.json();
    const updated = updateFlag(key, updates);
    
    if (!updated) {
      return new Response(
        JSON.stringify({ error: 'Flag not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, flag: updated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Delete flag (admin only)
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { key } = await request.json();
    const deleted = deleteFlag(key);
    
    return new Response(
      JSON.stringify({ success: deleted }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
