/**
 * Blog API - Okuma Geçmişi
 * POST /api/blog/reading-history - Okuma geçmişini kaydet
 * GET /api/blog/reading-history - Kullanıcının okuma geçmişini getir
 */

import type { APIRoute } from 'astro';
import { insert, queryRows } from '../../../lib/postgres';
import { validateWithSchema } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

// Okuma geçmişi kaydet
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Kullanıcı kontrolü
    if (!locals.user?.id) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/blog/reading-history', HttpStatus.UNAUTHORIZED, duration);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Giriş yapmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();

    // Validasyon
    const schema = {
      postId: { type: 'number' as const, required: true, min: 1 },
      timeSpentSeconds: { type: 'number' as const, required: true, min: 0 },
      scrollPercentage: { type: 'number' as const, required: false, min: 0, max: 100 }
    };

    const validation = validateWithSchema(body, schema as any);
    if (!validation.valid) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/blog/reading-history', HttpStatus.UNPROCESSABLE_ENTITY, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz veriler',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    // Okuma geçmişini kaydet (INSERT ... ON CONFLICT UPDATE)
    await insert('blog_reading_history', {
      user_id: locals.user.id,
      post_id: validation.data.postId,
      time_spent_seconds: validation.data.timeSpentSeconds,
      scroll_percentage: validation.data.scrollPercentage || 0
    });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/reading-history', HttpStatus.CREATED, duration);

    return apiResponse(
      {
        success: true,
        message: 'Okuma geçmişi kaydedildi'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/reading-history', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });
    logger.error('Okuma geçmişi kaydedilemedi', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Okuma geçmişi kaydedilirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// Okuma geçmişini getir
export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Kullanıcı kontrolü
    if (!locals.user?.id) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/blog/reading-history', HttpStatus.UNAUTHORIZED, duration);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Giriş yapmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    const history = await queryRows(
      `SELECT brh.*, bp.title, bp.slug, bp.featured_image
       FROM blog_reading_history brh
       JOIN blog_posts bp ON brh.post_id = bp.id
       WHERE brh.user_id = $1
       ORDER BY brh.created_at DESC
       LIMIT $2`,
      [locals.user.id, limit]
    );

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/reading-history', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          items: history.map((h: any) => ({
            postId: h.post_id,
            title: h.title,
            slug: h.slug,
            featuredImage: h.featured_image,
            timeSpentSeconds: h.time_spent_seconds,
            scrollPercentage: h.scroll_percentage,
            readAt: h.created_at
          })),
          count: history.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/reading-history', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });
    logger.error('Okuma geçmişi alınamadı', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Okuma geçmişi alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
