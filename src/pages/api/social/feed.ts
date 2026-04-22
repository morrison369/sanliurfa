import type { APIRoute } from 'astro';
import { getUserFeed, createActivity } from '../../../lib/social-features';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const feed = await getUserFeed(locals.user.id, limit);

    return apiResponse({ success: true, data: feed }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Akış alınamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { activity_type, object_type, object_id, title, visibility } = body;

    if (!activity_type || !object_type || !object_id || !title) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Zorunlu alanlar eksik', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const activity = await createActivity(locals.user.id, activity_type, object_type, object_id, title, visibility || 'public');
    return apiResponse({ success: true, data: activity }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Aktivite oluşturulamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
