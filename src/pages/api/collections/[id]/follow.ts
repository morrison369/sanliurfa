/**
 * Collection follow endpoints
 * POST /api/collections/[id]/follow — Toggle follow status
 */

import type { APIRoute } from 'astro';
import { followCollection, unfollowCollection } from '../../../../lib/collections';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const { id } = context.params;
    const body = await context.request.json();

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Collection ID is required');
    }

    // Check if already following
    const isFollowing = await queryOne(
      'SELECT id FROM collection_followers WHERE collection_id = $1 AND user_id = $2',
      [id, context.locals.user.id]
    );

    let success = false;
    let message = '';

    if (isFollowing) {
      // Unfollow
      success = await unfollowCollection(id, context.locals.user.id);
      message = 'Koleksiyondan çıkıldı';
    } else {
      // Follow
      success = await followCollection(id, context.locals.user.id);
      message = 'Koleksiyona katıldı';
    }

    if (!success) {
      return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Operation failed');
    }

    logger.info('Collection follow status toggled', {
      userId: context.locals.user.id,
      collectionId: id,
      following: !isFollowing
    });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message,
      following: !isFollowing
    });
  } catch (error) {
    logger.error('Failed to toggle collection follow', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to toggle collection follow');
  }
};
