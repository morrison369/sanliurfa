// API: Blog post update (PostgreSQL)
import type { APIRoute } from 'astro';
import { update } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    
    const title = formData.get('title')?.toString();
    const excerpt = formData.get('excerpt')?.toString();
    const content = formData.get('content')?.toString();
    const category = formData.get('category')?.toString();
    const authorId = formData.get('author_id')?.toString();
    const status = formData.get('status')?.toString();
    const tags = formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean) || [];
    const isFeatured = formData.get('is_featured') === 'on';
    const publishedAt = formData.get('published_at')?.toString();

    if (!title || !excerpt || !content || !category) {
      return redirect(`/admin/blog/edit/${id}?error=missing_fields`);
    }

    await update('blog_posts', id, {
      title,
      excerpt,
      content,
      category,
      author_id: authorId,
      tags,
      is_featured: isFeatured,
      is_published: status === 'published',
      published_at: status === 'published' ? (publishedAt || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    });

    return redirect('/admin/blog?success=updated');
  } catch (err) {
    console.error('Blog post update error:', err);
    return redirect(`/admin/blog/edit/${params.id}?error=server_error`);
  }
};
