import type { APIRoute } from 'astro';
import { getTrendingHashtags, getTrendingPlaces } from '../../../lib/social-features';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    const type = url.searchParams.get('type') || 'hashtags';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const period = url.searchParams.get('period') || 'day';

    let data;
    if (type === 'hashtags') {
      data = await getTrendingHashtags(limit, period);
    } else if (type === 'places') {
      data = await getTrendingPlaces(limit, period);
    } else {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz tür', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    return apiResponse({ success: true, data }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Trend verileri alınamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
