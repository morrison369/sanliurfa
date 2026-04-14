/**
 * Admin Blog API
 * GET: List posts with filters
 * POST: Create new post
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getPosts, createPost } from '../../../../lib/blog/db';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const searchParams = url.searchParams;
    const filters = {
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await getPosts(filters);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get posts' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.slug || !body.content) {
      return new Response(
        JSON.stringify({ error: 'Title, slug and content are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const post = await createPost({
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt || body.content.substring(0, 200) + '...',
      content: body.content,
      content_html: body.content_html,
      category_id: body.category_id,
      author_id: auth.user.id,
      author_name: auth.user.full_name || auth.user.username || 'Admin',
      featured_image: body.featured_image,
      status: body.status || 'draft',
      published_at: body.published_at ? new Date(body.published_at) : undefined,
      meta_title: body.meta_title,
      meta_description: body.meta_description,
      is_featured: body.is_featured || false,
      is_pinned: body.is_pinned || false,
      tag_ids: body.tag_ids,
    });

    return new Response(JSON.stringify({ success: true, post }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create post' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
