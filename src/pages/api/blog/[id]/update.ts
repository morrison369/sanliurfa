import type { APIRoute } from 'astro';
import { updateBlogPost } from '../../../../lib/blog';
import { queryOne, update } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  const { id } = params;

  try {
    if (!locals.isAdmin) {
      return new Response(JSON.stringify({ error: 'Yetkisiz işlem' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const postId = Number.parseInt(id || '', 10);
    if (!Number.isFinite(postId)) {
      return redirect('/admin/blog?error=invalid_post_id');
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const excerpt = formData.get('excerpt')?.toString().trim();
    const content = formData.get('content')?.toString().trim();

    if (!title || !excerpt || !content) {
      return redirect(`/admin/blog/edit/${postId}?error=missing_fields`);
    }

    const categoryIdRaw = formData.get('category')?.toString();
    const authorId = formData.get('author_id')?.toString() || null;
    const statusValue = formData.get('status')?.toString() || 'draft';
    const status = statusValue === 'published' ? 'published' : 'draft';
    const categoryId = categoryIdRaw ? Number.parseInt(categoryIdRaw, 10) : undefined;

    const updatedPost = await updateBlogPost(postId, {
      title,
      excerpt,
      content,
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      status,
      isFeatured: formData.get('is_featured') === 'on',
    });

    if (!updatedPost) {
      throw new Error('Blog yazısı güncellenemedi');
    }

    if (authorId) {
      await update('blog_posts', postId, { author_id: authorId });
    }

    if (status === 'published') {
      const currentPost = await queryOne('SELECT published_at FROM blog_posts WHERE id = $1', [postId]);
      if (!currentPost?.published_at) {
        await update('blog_posts', postId, { published_at: new Date().toISOString() });
      }
    }

    return redirect('/admin/blog?success=post_updated');
  } catch (error) {
    console.error('Admin blog update error:', error);
    return redirect(`/admin/blog/edit/${id}?error=server_error`);
  }
};
