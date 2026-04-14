/**
 * Admin Blog Post Detail API
 * GET: Get single post
 * PUT: Update post
 * DELETE: Delete post
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getPostBySlug, updatePost, deletePost, getPostRevisions } from '../../../../lib/blog/db';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const id = url.pathname.split('/').pop();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Post ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if requesting revisions
    const searchParams = new URL(url).searchParams;
    if (searchParams.get('revisions') === 'true') {
      const revisions = await getPostRevisions(id);
      return new Response(JSON.stringify({ revisions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const post = await getPostBySlug(id);
    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get post' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const id = url.pathname.split('/').pop();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Post ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    
    const post = await updatePost(
      id,
      {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content,
        content_html: body.content_html,
        category_id: body.category_id,
        featured_image: body.featured_image,
        status: body.status,
        published_at: body.published_at ? new Date(body.published_at) : undefined,
        meta_title: body.meta_title,
        meta_description: body.meta_description,
        is_featured: body.is_featured,
        is_pinned: body.is_pinned,
        tag_ids: body.tag_ids,
      },
      auth.user.id,
      auth.user.full_name || auth.user.username
    );

    return new Response(JSON.stringify({ success: true, post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to update post' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (auth instanceof Response) return auth;

    const id = url.pathname.split('/').pop();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Post ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await deletePost(id);
    
    if (!success) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to delete post' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
