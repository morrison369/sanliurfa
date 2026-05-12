/**
 * Blog API - Kategoriler
 * GET /api/blog/categories - Tüm kategorileri listele
 */

import type { APIRoute } from 'astro';
import { getBlogCategories } from '../../../lib/blog';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeErrorDetail } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const categories = await getBlogCategories();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/categories', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          categories,
          count: categories.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/categories', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: safeErrorDetail(err, 'Blog kategorileri hatası')
    });
    logger.error('Blog kategorileri alınamadı', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Blog kategorileri yüklenirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
