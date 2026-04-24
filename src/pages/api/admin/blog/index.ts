/**
 * Admin Blog API
 * GET: List posts with filters
 * POST: Create new post
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getPosts, createPost } from '../../../../lib/blog/db';
import { problemJson } from '../../../../lib/api';

type BlogStatus = 'draft' | 'published' | 'scheduled' | 'archived';

type CreateBlogPostBody = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  content_html?: string;
  category_id?: string;
  featured_image?: string;
  status?: BlogStatus;
  published_at?: string;
  meta_title?: string;
  meta_description?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
  tag_ids?: string[];
};

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-unauthorized',
        instance: '/api/admin/blog',
      });
    }

    const searchParams = url.searchParams;
    const filters = {
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      limit: toPositiveInt(searchParams.get('limit'), 20),
      offset: toPositiveInt(searchParams.get('offset'), 0),
    };

    const result = await getPosts(filters);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Yazılar Alınamadı',
      detail: error instanceof Error ? error.message : 'Yazılar alınamadı',
      type: '/problems/admin-blog-get-failed',
      instance: '/api/admin/blog',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-unauthorized',
        instance: '/api/admin/blog',
      });
    }

    const body = (await request.json().catch(() => ({}))) as CreateBlogPostBody;
    
    // Validate required fields
    if (!body.title || !body.slug || !body.content) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Başlık, slug ve içerik zorunludur',
        type: '/problems/admin-blog-validation',
        instance: '/api/admin/blog',
      });
    }

    const post = await createPost({
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt || body.content.substring(0, 200) + '...',
      content: body.content,
      content_html: body.content_html,
      category_id: body.category_id,
      author_id: auth.user.id,
      author_name: auth.user.full_name || auth.user.email || 'Admin',
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
    return problemJson({
      status: 500,
      title: 'Yazı Oluşturulamadı',
      detail: error instanceof Error ? error.message : 'Yazı oluşturulamadı',
      type: '/problems/admin-blog-create-failed',
      instance: '/api/admin/blog',
    });
  }
};

