/**
 * Admin Blog Categories API
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getCategories, createCategory } from '../../../../lib/blog/db';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const categories = await getCategories();
    
    return new Response(JSON.stringify({ categories }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get categories' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const body = await request.json();
    
    if (!body.slug || !body.name) {
      return new Response(
        JSON.stringify({ error: 'Slug and name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const category = await createCategory({
      slug: body.slug,
      name: body.name,
      description: body.description,
      color: body.color,
      icon: body.icon,
      parent_id: body.parent_id,
      sort_order: body.sort_order || 0,
      is_active: body.is_active !== false,
    });

    return new Response(JSON.stringify({ success: true, category }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create category' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
