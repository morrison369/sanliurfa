/**
 * Blog API - Yazılar
 * GET /api/blog/posts - Blog yazılarını listele (filtreleme, sıralama, sayfalama)
 * POST /api/blog/posts - Yeni blog yazısı oluştur (admin only)
 */

import type { APIRoute } from 'astro';
import { getBlogPosts, createBlogPost } from '../../../../lib/blog';
import { validateWithSchema, commonSchemas } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const status = (url.searchParams.get('status') || 'published') as string;
    const categoryId = url.searchParams.get('categoryId') ? parseInt(url.searchParams.get('categoryId')!) : undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sort = (url.searchParams.get('sort') || 'recent') as 'recent' | 'featured' | 'popular';

    const { posts, total } = await getBlogPosts({
      status,
      categoryId,
      limit,
      offset,
      sort
    });

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/posts', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          posts,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/posts', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });
    logger.error('Blog yazıları alınamadı', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Blog yazıları yüklenirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Yetki kontrolü - sadece admin
    if (!locals.isAdmin) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/blog/posts', HttpStatus.FORBIDDEN, duration);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Bu işlem için yönetici yetkisi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const body = await request.json();

    // Validasyon
    const postSchema = {
      title: { type: 'string' as const, required: true, minLength: 3, maxLength: 255, sanitize: true },
      content: { type: 'string' as const, required: true, minLength: 10, sanitize: true },
      excerpt: { type: 'string' as const, required: false, maxLength: 500, sanitize: true },
      categoryId: { type: 'number' as const, required: false, min: 1 },
      featuredImage: { type: 'string' as const, required: false, sanitize: true },
      thumbnail: { type: 'string' as const, required: false, sanitize: true },
      status: { type: 'string' as const, required: false },
      isFeatured: { type: 'boolean' as const, required: false },
      seoTitle: { type: 'string' as const, required: false, maxLength: 255, sanitize: true },
      seoDescription: { type: 'string' as const, required: false, maxLength: 500, sanitize: true },
      seoKeywords: { type: 'string' as const, required: false, sanitize: true },
      tags: { type: 'string' as const, required: false }
    };

    const validation = validateWithSchema(body, postSchema as any);
    if (!validation.valid) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/blog/posts', HttpStatus.UNPROCESSABLE_ENTITY, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz veriler',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    // Blog yazısı oluştur
    const tags = typeof body.tags === 'string' ? body.tags.split(',').map((t: string) => t.trim()) : [];

    const post = await createBlogPost({
      title: validation.data.title,
      content: validation.data.content,
      excerpt: validation.data.excerpt,
      categoryId: validation.data.categoryId,
      featuredImage: validation.data.featuredImage,
      thumbnail: validation.data.thumbnail,
      status: validation.data.status || 'draft',
      isFeatured: validation.data.isFeatured || false,
      seoTitle: validation.data.seoTitle,
      seoDescription: validation.data.seoDescription,
      seoKeywords: validation.data.seoKeywords,
      tags,
      authorId: locals.user?.id
    });

    if (!post) {
      throw new Error('Blog yazısı oluşturulamadı');
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/posts', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'blog_posts', post.id, locals.user?.id, { duration });

    return apiResponse(
      {
        success: true,
        data: post
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/posts', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });
    logger.error('Blog yazısı oluşturulamadı', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Blog yazısı oluşturulurken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
