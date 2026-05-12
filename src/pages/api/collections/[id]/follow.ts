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
      return apiError('UNAUTHORIZED', 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const { id } = context.params;
    if (!id) {
      return apiError('VALIDATION_ERROR', 'Collection ID is required', HttpStatus.BAD_REQUEST);
    }

    // Check if already following
    const isFollowing = await queryOne(
      'SELECT id FROM collection_followers WHERE collection_id = $1 AND user_id = $2',
      [id, context.locals.user.id]
    );

    let message = '';

    if (isFollowing) {
      await unfollowCollection(id, context.locals.user.id);
      message = 'Koleksiyondan çıkıldı';
    } else {
      await followCollection(id, context.locals.user.id);
      message = 'Koleksiyona katıldı';
    }

    logger.info('Collection follow status toggled', {
      userId: context.locals.user.id,
      collectionId: id,
      following: !isFollowing
    });

    return apiResponse({ success: true, message, following: !isFollowing }, HttpStatus.OK);
  } catch (error) {
    logger.error('Failed to toggle collection follow', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to toggle collection follow', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
