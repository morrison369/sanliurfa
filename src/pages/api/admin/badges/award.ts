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
import { withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

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
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/badges/award',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('POST', '/api/admin/badges/award', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('POST', '/api/admin/badges/award', response.status, duration);
        },
      },
      async () => {
        const body = await request.json();
        const validation = validateWithSchema(body, awardBadgeSchema);
        if (!validation.valid) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid input',
            HttpStatus.UNPROCESSABLE_ENTITY,
            validation.errors,
            requestId
          );
        }

        const { placeId, badgeType, reason } = validation.data;
        const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
        if (!place) {
          return apiError(
            ErrorCode.NOT_FOUND,
            'Place not found',
            HttpStatus.NOT_FOUND,
            undefined,
            requestId
          );
        }

        const badge = await awardBadge(placeId, badgeType, locals.user?.id, reason);
        if (!badge) {
          return apiError(
            ErrorCode.NOT_FOUND,
            'Badge type not found',
            HttpStatus.NOT_FOUND,
            undefined,
            requestId
          );
        }

        logger.logMutation('award', 'place_badges', badge.id, locals.user?.id);
        return apiResponse(
          {
            success: true,
            badge,
          },
          HttpStatus.CREATED,
          requestId
        );
      }
    );
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
