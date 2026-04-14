// @ts-nocheck
import type { APIRoute } from 'astro';
import { getAllFlags, listFlags, updateFlag, deleteFlag, isEnabled } from '../../lib/feature-flags/feature-flags';

// GET: Get all flags for current user
export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.user?.id;
  const flags = getAllFlags({ userId });
  
  return new Response(
    JSON.stringify({ flags }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// POST: Check specific flag
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { key } = await request.json();
    const userId = locals.user?.id;
    
    const enabled = isEnabled(key, { userId });
    
    return new Response(
      JSON.stringify({ key, enabled }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
