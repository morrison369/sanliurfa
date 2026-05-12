import type { APIRoute } from 'astro';
import { getAllFlags, isEnabled } from '../../lib/feature-flags/feature-flags';
import { problemJson } from '../../lib/api';

// GET: Get all flag values for current user
export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.user?.id;
  const flags = await getAllFlags(userId ? { userId } : undefined);
  return new Response(
    JSON.stringify({ flags }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// POST: Check a specific flag
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { key } = await request.json();
    const userId = locals.user?.id;
    const enabled = await isEnabled(key, userId ? { userId } : undefined);
    return new Response(
      JSON.stringify({ key, enabled }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Geçersiz İstek',
      detail: 'Geçersiz istek gövdesi',
      type: '/problems/flags-invalid-request',
      instance: '/api/flags',
    });
  }
};
