/**
 * Blog API - Yazı Detayı
 * GET /api/blog/posts/[slug] - Blog yazısını slug ile getir
 * PUT /api/blog/posts/[slug] - Blog yazısını güncelle (admin only)
 * DELETE /api/blog/posts/[slug] - Blog yazısını sil (admin only)
 */

import type { APIRoute } from 'astro';
import { getBlogPostBySlug, updateBlogPost, deleteBlogPost } from '../../../../lib/blog';
import { queryOne } from '../../../../lib/postgres';
import { validateWithSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ params, request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { slug } = params;

    if (!slug) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Slug parametresi gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const post = await getBlogPostBySlug(slug);

    if (!post) {
      const duration = Date.now() - startTime;
      recordRequest('GET', `/api/blog/posts/${slug}`, HttpStatus.NOT_FOUND, duration);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Blog yazısı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/blog/posts/${slug}`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: post
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/blog/posts/${params.slug}`, HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });
    logger.error('Blog yazısı alınamadı', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Blog yazısı yüklenirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Yetki kontrolü
    if (!locals.isAdmin) {
      const duration = Date.now() - startTime;
      recordRequest('PUT', `/api/blog/posts/${params.slug}`, HttpStatus.FORBIDDEN, duration);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Bu işlem için yönetici yetkisi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const { slug } = params;

    if (!slug) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Slug parametresi gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Post'u ID ile bul
    const post = await queryOne('SELECT id FROM blog_posts WHERE slug = $1', [slug]);

    if (!post) {
      const duration = Date.now() - startTime;
      recordRequest('PUT', `/api/blog/posts/${slug}`, HttpStatus.NOT_FOUND, duration);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Blog yazısı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const body = await request.json();

    // Kısmi validasyon (tüm alanlar opsiyonel)
    const updateSchema = {
      title: { type: 'string' as const, required: false, minLength: 3, maxLength: 255, sanitize: true },
      content: { type: 'string' as const, required: false, minLength: 10, sanitize: true },
      excerpt: { type: 'string' as const, required: false, maxLength: 500, sanitize: true },
      categoryId: { type: 'number' as const, required: false, min: 1 },
      featuredImage: { type: 'string' as const, required: false, sanitize: true },
      status: { type: 'string' as const, required: false },
      isFeatured: { type: 'boolean' as const, required: false },
      seoTitle: { type: 'string' as const, required: false, maxLength: 255, sanitize: true },
      seoDescription: { type: 'string' as const, required: false, maxLength: 500, sanitize: true },
      seoKeywords: { type: 'string' as const, required: false, sanitize: true },
      tags: { type: 'string' as const, required: false }
    };

    const validation = validateWithSchema(body, updateSchema as any);
    if (!validation.valid) {
      const duration = Date.now() - startTime;
      recordRequest('PUT', `/api/blog/posts/${slug}`, HttpStatus.UNPROCESSABLE_ENTITY, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz veriler',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    // Etiketleri dönüştür
    const tags = validation.data.tags
      ? typeof validation.data.tags === 'string'
        ? validation.data.tags.split(',').map((t: string) => t.trim())
        : validation.data.tags
      : undefined;

    // Blog yazısını güncelle
    const updatedPost = await updateBlogPost(post.id, {
      ...validation.data,
      tags
    });

    if (!updatedPost) {
      throw new Error('Blog yazısı güncellenemedi');
    }

    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/blog/posts/${slug}`, HttpStatus.OK, duration);
    logger.logMutation('update', 'blog_posts', post.id, locals.user?.id, { duration });

    return apiResponse(
      {
        success: true,
        data: updatedPost
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', `/api/blog/posts/${params.slug}`, HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });
    logger.error('Blog yazısı güncellenemedi', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Blog yazısı güncellenirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Yetki kontrolü
    if (!locals.isAdmin) {
      const duration = Date.now() - startTime;
      recordRequest('DELETE', `/api/blog/posts/${params.slug}`, HttpStatus.FORBIDDEN, duration);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Bu işlem için yönetici yetkisi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const { slug } = params;

    if (!slug) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Slug parametresi gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // Post'u ID ile bul
    const post = await queryOne('SELECT id FROM blog_posts WHERE slug = $1', [slug]);

    if (!post) {
      const duration = Date.now() - startTime;
      recordRequest('DELETE', `/api/blog/posts/${slug}`, HttpStatus.NOT_FOUND, duration);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Blog yazısı bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Blog yazısını sil
    const success = await deleteBlogPost(post.id);

    if (!success) {
      throw new Error('Blog yazısı silinemedi');
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/blog/posts/${slug}`, HttpStatus.OK, duration);
    logger.logMutation('delete', 'blog_posts', post.id, locals.user?.id, { duration });

    return apiResponse(
      {
        success: true,
        message: 'Blog yazısı başarıyla silindi'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', `/api/blog/posts/${params.slug}`, HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });
    logger.error('Blog yazısı silinemedi', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Blog yazısı silinirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
