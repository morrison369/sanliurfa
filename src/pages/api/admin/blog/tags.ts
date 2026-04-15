/**
 * Admin Blog Tags API
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getTags, createTag } from '../../../../lib/blog/db';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const tags = await getTags();
    
    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get tags' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const body = await request.json();
    
    if (!body.slug || !body.name) {
      return new Response(
        JSON.stringify({ error: 'Slug and name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tag = await createTag({
      slug: body.slug,
      name: body.name,
      description: body.description,
      color: body.color,
    });

    return new Response(JSON.stringify({ success: true, tag }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create tag' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
