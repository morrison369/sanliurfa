import type { APIRoute } from 'astro';
import { getUserFeed, createActivity } from '../../../lib/social/social-features';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = safeIntParam(url.searchParams.get('limit'), 50, 0, 1_000_000);
    const feed = await getUserFeed(locals.user.id, limit);

    return apiResponse({ success: true, data: feed }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get feed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { activity_type, object_type, object_id, title, visibility } = body;

    if (!activity_type || !object_type || !object_id || !title) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Missing required fields', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const VALID_ACTIVITY_TYPES = new Set(['post', 'review', 'checkin', 'share', 'like', 'follow', 'achievement']);
    const VALID_OBJECT_TYPES   = new Set(['place', 'review', 'post', 'event', 'recipe', 'user']);
    const VALID_VISIBILITY     = new Set(['public', 'friends', 'private']);

    if (!VALID_ACTIVITY_TYPES.has(activity_type)) return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz activity_type', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    if (!VALID_OBJECT_TYPES.has(object_type)) return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz object_type', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    if (visibility !== undefined && visibility !== null && (typeof visibility !== 'string' || !VALID_VISIBILITY.has(visibility))) return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz visibility', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    if (typeof title !== 'string' || title.length > 200) return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık 200 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);

    const activity = await createActivity(locals.user.id, activity_type, object_type, object_id, title, visibility || 'public');
    return apiResponse({ success: true, data: activity }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Failed to create activity', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
