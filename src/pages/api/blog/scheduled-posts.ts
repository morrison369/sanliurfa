/**
 * Blog API - Planlanmış Yazılar
 * GET /api/blog/scheduled-posts - Planlanmış yazıları getir (admin)
 * Process endpoint - Yayın zamanı gelmiş yazıları otomatik yayınla
 */

import type { APIRoute } from 'astro';
import { queryMany, queryOne, update } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { deleteCache, deleteCachePattern } from '../../../lib/cache';

// Planlanmış yazıları getir
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Yetki kontrolü
    if (!locals.isAdmin) {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/blog/scheduled-posts', HttpStatus.FORBIDDEN, duration);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Bu işlem için yönetici yetkisi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Planlanmış yazıları getir
    const scheduled = await queryMany(`
      SELECT
        id, title, slug, status, published_at,
        CASE
          WHEN published_at > NOW() THEN 'scheduled'
          WHEN published_at <= NOW() AND status = 'draft' THEN 'ready_to_publish'
          ELSE 'published'
        END as schedule_status
      FROM blog_posts
      WHERE status IN ('draft', 'published') AND published_at IS NOT NULL
      ORDER BY published_at ASC
    `);

    // Otomatik yayınla
    const ready = scheduled.filter((p: any) => p.schedule_status === 'ready_to_publish');
    if (ready.length > 0) {
      for (const post of ready) {
        await update('blog_posts', { id: post.id }, { status: 'published' });
        logger.info('Planlanmış yazı yayınlandı', { postId: post.id, title: post.title });
      }
      await deleteCachePattern('sanliurfa:blog:*');
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/scheduled-posts', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          scheduled: scheduled.filter((p: any) => p.schedule_status === 'scheduled'),
          autoPublished: ready.length,
          total: scheduled.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/scheduled-posts', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Planlanmış yazılar alınamadı', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Planlanmış yazılar alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// POST - Yazıyı planla
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/blog/scheduled-posts', HttpStatus.FORBIDDEN, duration);
      return apiError(ErrorCode.UNAUTHORIZED, 'Yönetici yetkisi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { postId, publishAt } = body;

    if (!postId || !publishAt) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'postId ve publishAt gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const publishDate = new Date(publishAt);
    if (publishDate < new Date()) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçmiş bir tarih seçilemez', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Yazıyı planla
    await update('blog_posts', { id: postId }, { published_at: publishDate.toISOString() });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/scheduled-posts', HttpStatus.OK, duration);
    logger.logMutation('schedule', 'blog_posts', postId, locals.user?.id, { publishAt });

    await deleteCachePattern('sanliurfa:blog:*');

    return apiResponse(
      {
        success: true,
        message: `Yazı ${publishDate.toLocaleDateString('tr-TR')} tarihinde yayınlanacak`
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/blog/scheduled-posts', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Yazı planlama başarısız', err instanceof Error ? err : new Error(String(err)));

    return apiError(ErrorCode.INTERNAL_ERROR, 'Yazı planlanırken hata oluştu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
