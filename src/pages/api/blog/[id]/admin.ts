import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { authenticateUser } from '../../../../lib/auth/middleware';
import { logger } from '../../../../lib/logging';

export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;
    const body = await context.request.json();

    const existing = await query('SELECT id, status FROM blog_posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const allowedFields = [
      'title', 'slug', 'excerpt', 'content', 'cover_image', 
      'category', 'tags', 'status', 'meta_title', 'meta_description', 'featured'
    ];
    
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (body.status === 'published' && existing.rows[0].status !== 'published') {
      updates.push(`published_at = NOW()`);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return new Response(JSON.stringify({
      success: true,
      post: result.rows[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Update blog post error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;

    await query('DELETE FROM blog_posts WHERE id = $1', [id]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Post deleted'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Delete blog post error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
