/**
 * Admin Blog Post Detail API
 * GET: Get single post
 * PUT: Update post
 * DELETE: Delete post
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getPostBySlug, updatePost, deletePost, getPostRevisions } from '../../../../lib/blog/db';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail } from '../../../../lib/api';

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
      return apiResponse({ revisions }, HttpStatus.OK);
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

    return apiResponse({ post }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Yazı Detayı Alınamadı',
      detail: safeErrorDetail(error, 'Yazı detayı alınamadı'),
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

    const VALID_BLOG_STATUSES = new Set<BlogStatus>(['draft', 'published', 'scheduled', 'archived']);
    if (body.status !== undefined && body.status !== null && (typeof body.status !== 'string' || !VALID_BLOG_STATUSES.has(body.status))) {
      return problemJson({
        status: 422,
        title: 'Geçersiz Durum',
        detail: 'Geçersiz yazı durumu',
        type: '/problems/admin-blog-post-validation',
        instance: url.pathname,
      });
    }

    if (body.title !== undefined && body.title !== null && (typeof body.title !== 'string' || body.title.length > 200)) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'Başlık 200 karakterden uzun olamaz', type: '/problems/admin-blog-post-validation', instance: url.pathname });
    if (body.slug !== undefined && body.slug !== null && (typeof body.slug !== 'string' || body.slug.length > 200)) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'Slug 200 karakterden uzun olamaz', type: '/problems/admin-blog-post-validation', instance: url.pathname });
    if (body.excerpt !== undefined && body.excerpt !== null && (typeof body.excerpt !== 'string' || body.excerpt.length > 1000)) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'Özet 1000 karakterden uzun olamaz', type: '/problems/admin-blog-post-validation', instance: url.pathname });
    if (body.content !== undefined && body.content !== null && (typeof body.content !== 'string' || body.content.length > 100000)) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'İçerik 100.000 karakterden uzun olamaz', type: '/problems/admin-blog-post-validation', instance: url.pathname });
    if (body.meta_title !== undefined && body.meta_title !== null && (typeof body.meta_title !== 'string' || body.meta_title.length > 200)) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'Meta başlık 200 karakterden uzun olamaz', type: '/problems/admin-blog-post-validation', instance: url.pathname });
    if (body.meta_description !== undefined && body.meta_description !== null && (typeof body.meta_description !== 'string' || body.meta_description.length > 500)) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'Meta açıklama 500 karakterden uzun olamaz', type: '/problems/admin-blog-post-validation', instance: url.pathname });
    if (body.tag_ids && (!Array.isArray(body.tag_ids) || body.tag_ids.length > 50)) return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'tag_ids dizisi geçersiz veya 50 etiket sınırını aşıyor', type: '/problems/admin-blog-post-tag-ids-invalid', instance: url.pathname });

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

    return apiResponse({ success: true, post }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Yazı Güncellenemedi',
      detail: safeErrorDetail(error, 'Yazı güncellenemedi'),
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

    return apiResponse({ success: true }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Yazı Silinemedi',
      detail: safeErrorDetail(error, 'Yazı silinemedi'),
      type: '/problems/admin-blog-post-delete-failed',
      instance: url.pathname,
    });
  }
};

