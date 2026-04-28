/**
 * Award Badge to Place (Admin)
 * POST /api/admin/badges/award - Award a badge to a place
 */

import type { APIRoute } from 'astro';
import { awardBadge } from '../../../../lib/place/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { validateWithSchema, type ValidationSchema } from '../../../../lib/validation';
import { queryOne } from '../../../../lib/postgres';

type AwardBadgeBody = {
  placeId: string;
  badgeType: string;
  reason?: string;
};

type PlaceIdRow = {
  id: string;
};

const awardBadgeSchema: ValidationSchema = {
  placeId: {
    type: 'string',
    required: true,
    minLength: 36,
    maxLength: 36,
  },
  badgeType: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 50,
    sanitize: true,
  },
  reason: {
    type: 'string',
    required: false,
    maxLength: 500,
    sanitize: true,
  },
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin auth required
    if (locals.user?.role !== 'admin') {
      recordRequest('POST', '/api/admin/badges/award', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin yetkisi gerekli',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const body = await request.json().catch(() => ({}));

    const validation = validateWithSchema(body, awardBadgeSchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/admin/badges/award', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz rozet bilgisi',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { placeId, badgeType, reason } = validation.data as AwardBadgeBody;

    const place = await queryOne<PlaceIdRow>('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('POST', '/api/admin/badges/award', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Mekan bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const badge = await awardBadge(placeId, badgeType, locals.user.id, reason);

    if (!badge) {
      recordRequest('POST', '/api/admin/badges/award', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Rozet tipi bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    recordRequest('POST', '/api/admin/badges/award', HttpStatus.CREATED, Date.now() - startTime);

    logger.logMutation('award', 'place_badges', badge.id, locals.user.id);

    return apiResponse({
      success: true,
      badge,
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/badges/award', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Rozet verme başarısız', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Rozet verilemedi',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
