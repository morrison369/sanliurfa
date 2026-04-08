/**
 * Place Rating Distribution API
 * GET: Get rating distribution for a place (count by star rating)
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../lib/postgres';
import { getCache, setCache } from '../../../../lib/cache';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const placeId = params.id;
    const cacheKey = `sanliurfa:rating-dist:${placeId}`;

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      recordRequest('GET', `/api/places/${placeId}/rating-distribution`, HttpStatus.OK, duration);
      return apiResponse(
        { success: true, data: JSON.parse(cached as string) },
        HttpStatus.OK,
        requestId
      );
    }

    // Get rating distribution
    const result = await queryOne(
      `SELECT
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_stars,
        COUNT(*) as total_reviews,
        ROUND(AVG(rating)::numeric, 1) as average_rating
       FROM reviews
       WHERE place_id = $1 AND rating IS NOT NULL`,
      [placeId]
    );

    const distribution = {
      five_stars: parseInt(result?.five_stars || '0'),
      four_stars: parseInt(result?.four_stars || '0'),
      three_stars: parseInt(result?.three_stars || '0'),
      two_stars: parseInt(result?.two_stars || '0'),
      one_stars: parseInt(result?.one_stars || '0'),
      total_reviews: parseInt(result?.total_reviews || '0'),
      average_rating: parseFloat(result?.average_rating || '0')
    };

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(distribution), 3600);

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/places/${placeId}/rating-distribution`, HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: distribution },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/places/${params.id}/rating-distribution`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get rating distribution failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Rating dağılımı alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
