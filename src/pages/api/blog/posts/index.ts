/**
 * Blog API - Yazılar
 * GET /api/blog/posts - Blog yazılarını listele (filtreleme, sıralama, sayfalama)
 * POST /api/blog/posts - Yeni blog yazısı oluştur (admin only)
 */

import type { APIRoute } from 'astro';
import { getBlogPosts, createBlogPost } from '../../../../lib/blog';
import { validateWithSchema, type ValidationSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam, safeErrorDetail } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { generateSlug } from '../../../../lib/seo-utils';

type BlogPostStatus = 'published' | 'draft' | 'all';

const VALID_POST_STATUSES = new Set<BlogPostStatus>(['published', 'draft', 'all']);

type BlogPostCreateInput = {
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  categoryId?: number;
  featuredImage?: string;
  thumbnail?: string;
  status?: 'draft' | 'published';
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tags?: string;
};


export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const rawStatus = url.searchParams.get('status') || 'published';
    const status: BlogPostStatus = VALID_POST_STATUSES.has(rawStatus as BlogPostStatus)
      ? (rawStatus as BlogPostStatus)
      : 'published';
    const rawCategory = url.searchParams.get('category') || url.searchParams.get('categoryId');
    const category = rawCategory ? rawCategory.substring(0, 100) : undefined;
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
    const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);
    const page = Math.floor(Math.max(offset, 0) / Math.max(limit, 1)) + 1;

    const { posts, total } = await getBlogPosts({
      status,
      category,
      limit,
      page,
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
      error: safeErrorDetail(err, 'Blog yazısı işlemi başarısız')
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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Yetki kontrolü - sadece admin
    if (locals.user?.role !== 'admin') {
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
    const postSchema: ValidationSchema = {
      title: { type: 'string' as const, required: true, minLength: 3, maxLength: 255, sanitize: true },
      content: { type: 'string' as const, required: true, minLength: 10, maxLength: 100000, sanitize: true },
      excerpt: { type: 'string' as const, required: false, maxLength: 500, sanitize: true },
      category: { type: 'string' as const, required: false, maxLength: 120, sanitize: true },
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

    const validation = validateWithSchema(body, postSchema);
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

    const data = validation.data as BlogPostCreateInput;

    // Blog yazısı oluştur
    const tags =
      typeof data.tags === 'string'
        ? data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

    const post = await createBlogPost({
      slug: generateSlug(data.seoTitle || data.title),
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || data.seoDescription || data.content.slice(0, 180),
      category: data.category || (data.categoryId ? String(data.categoryId) : 'genel'),
      cover_image: data.featuredImage || data.thumbnail,
      status: data.status || 'draft',
      tags,
      author_id: locals.user?.id || 'system',
    });

    if (!post) {
      throw new Error('Blog yazısı oluşturulamadı');
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/posts', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'blog_posts', post.id, locals.user?.id);

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
      error: safeErrorDetail(err, 'Blog yazısı işlemi başarısız')
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
