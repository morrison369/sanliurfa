/**
 * Award Badge to Place (Admin)
 * POST /api/admin/badges/award - Award a badge to a place
 */

import type { APIRoute } from 'astro';
import { awardBadge } from '../../../../lib/place-verification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { validateWithSchema } from '../../../../lib/validation';
import { queryOne } from '../../../../lib/postgres';

const awardBadgeSchema = {
  placeId: {
    type: 'string' as const,
    required: true,
    minLength: 36,
    maxLength: 36
  },
  badgeType: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 50,
    sanitize: true
  },
  reason: {
    type: 'string' as const,
    required: false,
    maxLength: 500,
    sanitize: true
  }
} as any;

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Admin auth required
    if (!locals.user || !locals.isAdmin) {
      recordRequest('POST', '/api/admin/badges/award', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Admin access required',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Get request body
    const body = await request.json();

    // Validate input
    const validation = validateWithSchema(body, awardBadgeSchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/admin/badges/award', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { placeId, badgeType, reason } = validation.data;

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('POST', '/api/admin/badges/award', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Award badge
    const badge = await awardBadge(placeId, badgeType, locals.user.id, reason);

    if (!badge) {
      recordRequest('POST', '/api/admin/badges/award', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Badge type not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    recordRequest('POST', '/api/admin/badges/award', HttpStatus.CREATED, Date.now() - startTime);

    logger.logMutation('award', 'place_badges', badge.id, locals.user.id);

    return apiResponse({
      success: true,
      badge
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/badges/award', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to award badge', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to award badge',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
