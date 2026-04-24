/**
 * Admin Blog Post Detail API
 * GET: Get single post
 * PUT: Update post
 * DELETE: Delete post
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getPostBySlug, updatePost, deletePost, getPostRevisions } from '../../../../lib/blog/db';
import { problemJson } from '../../../../lib/api';

type BlogStatus = 'draft' | 'published' | 'scheduled' | 'archived';

type UpdateBlogPostBody = {
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

export const GET: APIRoute = async ({ request, url, params }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-post-unauthorized',
        instance: url.pathname,
      });
    }

    const id = params.id;
    if (!id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Yazı kimliği gerekli',
        type: '/problems/admin-blog-post-id-required',
        instance: url.pathname,
      });
    }

    // Check if requesting revisions
    const searchParams = url.searchParams;
    if (searchParams.get('revisions') === 'true') {
      const revisions = await getPostRevisions(id);
      return new Response(JSON.stringify({ revisions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const post = await getPostBySlug(id);
    if (!post) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Yazı bulunamadı',
        type: '/problems/admin-blog-post-not-found',
        instance: url.pathname,
      });
    }

    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Yazı Detayı Alınamadı',
      detail: error instanceof Error ? error.message : 'Yazı detayı alınamadı',
      type: '/problems/admin-blog-post-get-failed',
      instance: url.pathname,
    });
  }
};

export const PUT: APIRoute = async ({ request, url, params }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-post-unauthorized',
        instance: url.pathname,
      });
    }

    const id = params.id;
    if (!id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Yazı kimliği gerekli',
        type: '/problems/admin-blog-post-id-required',
        instance: url.pathname,
      });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateBlogPostBody;
    
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
      auth.user.full_name || auth.user.email
    );

    return new Response(JSON.stringify({ success: true, post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Yazı Güncellenemedi',
      detail: error instanceof Error ? error.message : 'Yazı güncellenemedi',
      type: '/problems/admin-blog-post-update-failed',
      instance: url.pathname,
    });
  }
};

export const DELETE: APIRoute = async ({ request, url, params }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-post-unauthorized',
        instance: url.pathname,
      });
    }

    const id = params.id;
    if (!id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Yazı kimliği gerekli',
        type: '/problems/admin-blog-post-id-required',
        instance: url.pathname,
      });
    }

    const success = await deletePost(id);
    
    if (!success) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Yazı bulunamadı',
        type: '/problems/admin-blog-post-not-found',
        instance: url.pathname,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Yazı Silinemedi',
      detail: error instanceof Error ? error.message : 'Yazı silinemedi',
      type: '/problems/admin-blog-post-delete-failed',
      instance: url.pathname,
    });
  }
};

