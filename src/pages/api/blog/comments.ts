/**
 * Blog API - Yorumlar
 * GET /api/blog/comments - Blog yazısının yorumlarını getir (query: postId)
 * POST /api/blog/comments - Blog yazısına yorum ekle (admin onayı gerekli)
 */

import type { APIRoute } from 'astro';
import { getBlogComments, addBlogComment } from '../../../lib/blog';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
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

    const postId = parseInt(postIdParam);

    if (isNaN(postId)) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'postId geçerli bir sayı olmalıdır',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const comments = await getBlogComments(postId, approved);

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
      error: err instanceof Error ? err.message : String(err)
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

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();

    // Validasyon
    const commentSchema = {
      postId: { type: 'number' as const, required: true, min: 1 },
      authorName: { type: 'string' as const, required: true, minLength: 2, maxLength: 100, sanitize: true },
      authorEmail: { type: 'string' as const, required: false, sanitize: true },
      content: { type: 'string' as const, required: true, minLength: 2, maxLength: 5000, sanitize: true },
      userId: { type: 'string' as const, required: false }
    };

    const validation = validateWithSchema(body, commentSchema as any);
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

    // Yorum ekle (onay beklemede)
    const comment = await addBlogComment(validation.data.postId, {
      authorName: validation.data.authorName,
      authorEmail: validation.data.authorEmail,
      userId: validation.data.userId,
      content: validation.data.content
    });

    if (!comment) {
      throw new Error('Yorum eklenemedi');
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/comments', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'blog_comments', comment.id, validation.data.userId, { duration });

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
      error: err instanceof Error ? err.message : String(err)
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
