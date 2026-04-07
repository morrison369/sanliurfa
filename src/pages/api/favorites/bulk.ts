import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { validateWithSchema, commonSchemas } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { deleteCachePattern } from '../../../lib/cache';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/favorites/bulk', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Kimlik dogrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { placeIds } = body;

    if (!Array.isArray(placeIds) || placeIds.length === 0) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'placeIds array gerekli', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (placeIds.length > 100) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Maximum 100 places at once', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const placeholders = placeIds.map((_, i) => `($1, $${i + 2})`).join(',');
    const result = await pool.query(
      `INSERT INTO favorites (user_id, place_id) VALUES ${placeholders}
       ON CONFLICT DO NOTHING
       RETURNING place_id`,
      [locals.user.id, ...placeIds]
    );

    await deleteCachePattern(`favorites:${locals.user.id}:*`);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/favorites/bulk', HttpStatus.CREATED, duration);

    logger.info('Bulk favorites added', { userId: locals.user.id, count: result.rowCount });

    return apiResponse({ count: result.rowCount || 0 }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/favorites/bulk', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Bulk add failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
