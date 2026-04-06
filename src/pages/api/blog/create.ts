// API: Blog post creation (PostgreSQL)
import type { APIRoute } from 'astro';
import { insert } from '../../../lib/postgres';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
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
    const status = formData.get('status')?.toString() || 'draft';
    const tags = formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean) || [];
    const isFeatured = formData.get('is_featured') === 'on';
    const slug = formData.get('slug')?.toString() || title?.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 60);
    const publishedAt = formData.get('published_at')?.toString();

    if (!title || !excerpt || !content || !category || !authorId) {
      return redirect('/admin/blog/add?error=missing_fields');
    }

    await insert('blog_posts', {
      slug,
      title,
      excerpt,
      content,
      category,
      author_id: authorId,
      tags,
      is_featured: isFeatured,
      is_published: status === 'published',
      published_at: status === 'published' ? (publishedAt || new Date().toISOString()) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return redirect('/admin/blog?success=created');
  } catch (err) {
    console.error('Blog post creation error:', err);
    return redirect('/admin/blog/add?error=server_error');
  }
};
