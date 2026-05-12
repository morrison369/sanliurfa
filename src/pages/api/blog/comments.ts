/**
 * Blog API - Yorumlar
 * GET /api/blog/comments - Blog yazısının yorumlarını getir (query: postId)
 * POST /api/blog/comments - Blog yazısına yorum ekle (admin onayı gerekli)
 */

import type { APIRoute } from 'astro';
import { getBlogComments, addBlogComment } from '../../../lib/blog';
import { validateWithSchema, type ValidationSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeErrorDetail, safeIntParam } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { invalidateComment } from '../../../lib/cache/invalidation';

type BlogCommentInput = {
  postId: number;
  authorName: string;
  authorEmail?: string;
  content: string;
};

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const postIdParam = url.searchParams.get('postId');
    const approved = url.searchParams.get('approved') !== 'false';

    if (!postIdParam) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'postId parametresi gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const postId = safeIntParam(postIdParam, 0, 1, Number.MAX_SAFE_INTEGER);
    if (postId === 0) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'postId geçerli bir sayı olmalıdır',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const comments = await getBlogComments(String(postId), { approved });

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/comments', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          comments,
          count: comments.length,
          postId
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/comments', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: safeErrorDetail(err, 'Blog yorum işlemi başarısız')
    });
    logger.error('Blog yorumları alınamadı', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Blog yorumları yüklenirken hata oluştu',
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
    const body = await request.json();

    // Validasyon
    const commentSchema: ValidationSchema = {
      postId: { type: 'number' as const, required: true, min: 1 },
      authorName: { type: 'string' as const, required: true, minLength: 2, maxLength: 100, sanitize: true },
      authorEmail: { type: 'string' as const, required: false, sanitize: true },
      content: { type: 'string' as const, required: true, minLength: 2, maxLength: 5000, sanitize: true },
    };

    const validation = validateWithSchema(body, commentSchema);
    if (!validation.valid) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/blog/comments', HttpStatus.UNPROCESSABLE_ENTITY, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz veriler',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const data = validation.data as BlogCommentInput;

    // Use authenticated user ID if logged in, never trust client-supplied userId
    const userId = locals.user?.id;

    // Yorum ekle (onay beklemede)
    const comment = await addBlogComment({
      post_id: String(data.postId),
      author_name: data.authorName,
      author_email: data.authorEmail || '',
      ...(userId ? { user_id: userId } : {}),
      content: data.content,
    });

    if (!comment) {
      throw new Error('Yorum eklenemedi');
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/comments', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'blog_comments', comment.id, userId);

    // Cache invalidation: yeni blog yorumu blog:* + ilgili post detail cache'ini etkiler
    await invalidateComment('blog', String(data.postId));

    return apiResponse(
      {
        success: true,
        data: comment,
        message: 'Yorumunuz başarıyla gönderildi. Yönetici onayından sonra yayınlanacaktır.'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/comments', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: safeErrorDetail(err, 'Blog yorum işlemi başarısız')
    });
    logger.error('Blog yorumu eklenemedi', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Yorum eklenirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
