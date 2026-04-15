/**
 * GET /api/collections/[id]/followers/check
 * Returns whether the current user follows the collection
 */

import type { APIRoute } from 'astro';
import { queryOne } from '../../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logger';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    const { id } = params;
    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Collection ID zorunludur', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (!locals.user?.id) {
      // Not logged in — not following
      return apiResponse({ is_following: false }, HttpStatus.OK, requestId);
    }

    const row = await queryOne(
      'SELECT id FROM collection_followers WHERE collection_id = $1 AND user_id = $2',
      [id, locals.user.id]
    ).catch(() => null);

    return apiResponse({ is_following: !!row }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Collection follow check failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Takip durumu kontrol edilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
