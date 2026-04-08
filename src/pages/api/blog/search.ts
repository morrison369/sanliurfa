/**
 * Blog API - Arama
 * GET /api/blog/search - Blog yazılarında tam metin arama
 */

import type { APIRoute } from 'astro';
import { searchBlogPosts } from '../../../lib/blog';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const query = url.searchParams.get('q');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    if (!query || query.trim().length === 0) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/blog/search', HttpStatus.BAD_REQUEST, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Arama metni gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (query.trim().length < 2) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/blog/search', HttpStatus.BAD_REQUEST, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Arama metni en az 2 karakter olmalıdır',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const posts = await searchBlogPosts(query.trim(), limit);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/search', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          posts,
          count: posts.length,
          query: query.trim()
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/search', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });
    logger.error('Blog arama başarısız', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Blog arama yapılırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
