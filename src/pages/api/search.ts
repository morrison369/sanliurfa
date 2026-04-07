import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { search, getTrendingSearches, getSearchSuggestions } from '../../lib/search';
import { logger } from '../../lib/logging';
import { recordRequest } from '../../lib/metrics';

/**
 * GET /api/search - Kapsamlı arama
 * Query parametreleri:
 *   - q: Arama sorgusu (zorunlu)
 *   - type: Sonuç türü (places, reviews, blog, events, all - default: all)
 *   - category: Yer kategorisi filtresi
 *   - minRating: Minimum rating (0-5)
 *   - limit: Kaç sonuç (default: 20, max: 100)
 *   - offset: Pagination (default: 0)
 *   - trending: true ise trending aramaları göster
 *   - suggest: true ise autocomplete önerileri göster
 */
export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const q = url.searchParams.get('q');

    // Trending aramaları getir
    if (url.searchParams.get('trending') === 'true') {
      const trending = await getTrendingSearches(parseInt(url.searchParams.get('limit') || '10'));
      recordRequest('GET', '/api/search', HttpStatus.OK, Date.now() - startTime);
      return apiResponse({ trending }, HttpStatus.OK, requestId);
    }

    // Autocomplete önerileri
    if (url.searchParams.get('suggest') === 'true') {
      if (!q || q.length < 2) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'En az 2 karakter gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
      }

      const suggestions = await getSearchSuggestions(q, parseInt(url.searchParams.get('limit') || '5'));
      recordRequest('GET', '/api/search', HttpStatus.OK, Date.now() - startTime);
      return apiResponse({ suggestions }, HttpStatus.OK, requestId);
    }

    // Normal arama
    if (!q || q.trim().length === 0) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Arama sorgusu gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const results = await search({
      query: q.trim(),
      type: (url.searchParams.get('type') || 'all') as any,
      category: url.searchParams.get('category') || undefined,
      minRating: url.searchParams.get('minRating') ? parseInt(url.searchParams.get('minRating')!) : undefined,
      limit: Math.min(parseInt(url.searchParams.get('limit') || '20'), 100),
      offset: parseInt(url.searchParams.get('offset') || '0')
    });

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search', HttpStatus.OK, duration);

    logger.info('Arama yapıldı', {
      query: q,
      resultCount: results.total,
      executionTime: results.executionTime
    });

    return apiResponse(
      {
        ...results,
        duration
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Arama sırasında hata', error instanceof Error ? error : new Error(String(error)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Arama sırasında hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
