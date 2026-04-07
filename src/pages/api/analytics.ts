import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { getPopularPlaces, getWeeklySummary, getCategoryStats, getUserActivityAnalysis } from '../../lib/analytics';
import { logger } from '../../lib/logging';

/**
 * GET /api/analytics - İstatistikleri getir
 * Query parametreleri:
 *   - type: popular | weekly | categories | user
 *   - userId: Kullanıcı analizi için (type=user)
 *   - days: Kaç gün gerisine bakılsın (default: 30)
 */
export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    const type = url.searchParams.get('type') || 'weekly';

    switch (type) {
      case 'popular':
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const days = parseInt(url.searchParams.get('days') || '30');
        const popular = await getPopularPlaces(Math.min(limit, 100), days);

        return apiResponse(
          {
            type: 'popular_places',
            period: `last_${days}_days`,
            places: popular,
            count: popular.length
          },
          HttpStatus.OK,
          requestId
        );

      case 'weekly':
        const weekly = await getWeeklySummary();
        return apiResponse(
          { type: 'weekly_summary', ...weekly },
          HttpStatus.OK,
          requestId
        );

      case 'categories':
        const categories = await getCategoryStats();
        return apiResponse(
          {
            type: 'category_stats',
            categories,
            count: categories.length
          },
          HttpStatus.OK,
          requestId
        );

      case 'user':
        if (!locals.user?.id) {
          return apiError(
            ErrorCode.UNAUTHORIZED,
            'Giriş gerekli',
            HttpStatus.UNAUTHORIZED,
            undefined,
            requestId
          );
        }

        const analysis = await getUserActivityAnalysis(locals.user.id);
        return apiResponse(
          { type: 'user_activity', userId: locals.user.id, ...analysis },
          HttpStatus.OK,
          requestId
        );

      default:
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Bilinmeyen type: popular, weekly, categories, user',
          HttpStatus.BAD_REQUEST,
          undefined,
          requestId
        );
    }
  } catch (error) {
    logger.error('Analytics alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Analytics alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
