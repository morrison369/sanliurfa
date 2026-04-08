/**
 * Place Following
 * POST /api/places/[id]/follow - Follow a place
 * DELETE /api/places/[id]/follow - Unfollow a place
 */

import type { APIRoute } from 'astro';
import { followPlace, unfollowPlace, isFollowingPlace } from '../../../../lib/place-followers';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { queryOne } from '../../../../lib/postgres';

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('POST', '/api/places/[id]/follow', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id: placeId } = params;
    const userId = locals.user.id;

    // Verify place exists
    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      recordRequest('POST', '/api/places/[id]/follow', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Check if already following
    const alreadyFollowing = await isFollowingPlace(userId, placeId);
    if (alreadyFollowing) {
      recordRequest('POST', '/api/places/[id]/follow', HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.CONFLICT,
        'Already following this place',
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    // Follow place
    const success = await followPlace(userId, placeId);

    if (!success) {
      throw new Error('Failed to follow place');
    }

    recordRequest('POST', '/api/places/[id]/follow', HttpStatus.CREATED, Date.now() - startTime);

    return apiResponse({
      success: true,
      message: 'Mekan takip edildi'
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/places/[id]/follow', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to follow place', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to follow place',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('DELETE', '/api/places/[id]/follow', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id: placeId } = params;
    const userId = locals.user.id;

    // Check if following
    const isFollowing = await isFollowingPlace(userId, placeId);
    if (!isFollowing) {
      recordRequest('DELETE', '/api/places/[id]/follow', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Not following this place',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Unfollow place
    const success = await unfollowPlace(userId, placeId);

    if (!success) {
      throw new Error('Failed to unfollow place');
    }

    recordRequest('DELETE', '/api/places/[id]/follow', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      message: 'Mekan takibi bırakıldı'
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/places/[id]/follow', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to unfollow place', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to unfollow place',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
