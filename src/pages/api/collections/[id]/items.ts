/**
 * Collection items endpoints
 * POST /api/collections/[id]/items — Add place to collection
 * DELETE /api/collections/[id]/items?placeId=xxx — Remove place from collection
 */

import type { APIRoute } from 'astro';
import { addPlaceToCollection, removePlaceFromCollection } from '../../../../lib/collections';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { deleteCachePattern } from '../../../../lib/cache';
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

    const body = await context.request.json();

    if (!body.placeId || typeof body.placeId !== 'string') {
      return apiError('VALIDATION_ERROR', 'Place ID is required', HttpStatus.BAD_REQUEST);
    }

    if (body.note !== undefined && body.note !== null) {
      if (typeof body.note !== 'string' || body.note.length > 500) {
        return apiError('VALIDATION_ERROR', 'note 500 karakterden uzun olamaz', HttpStatus.BAD_REQUEST);
      }
    }

    await addPlaceToCollection(id, body.placeId, context.locals.user.id, body.note || undefined);
    await deleteCachePattern('collections:*').catch(() => null);

    logger.info('Place added to collection', {
      userId: context.locals.user.id,
      collectionId: id,
      placeId: body.placeId
    });

    return apiResponse({ success: true, message: 'Yer koleksiyona eklendi' }, HttpStatus.CREATED);
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError('FORBIDDEN', 'Access denied', HttpStatus.FORBIDDEN);
    }
    logger.error('Failed to add place to collection', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to add place to collection', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError('UNAUTHORIZED', 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const { id } = context.params;
    const { placeId } = Object.fromEntries(context.url.searchParams);

    if (!id) {
      return apiError('VALIDATION_ERROR', 'Collection ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!placeId) {
      return apiError('VALIDATION_ERROR', 'Place ID is required', HttpStatus.BAD_REQUEST);
    }

    await removePlaceFromCollection(id, placeId, context.locals.user.id);
    await deleteCachePattern('collections:*').catch(() => null);

    logger.info('Place removed from collection', {
      userId: context.locals.user.id,
      collectionId: id,
      placeId
    });

    return apiResponse({ success: true, message: 'Yer koleksiyondan kaldırıldı' }, HttpStatus.OK);
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError('FORBIDDEN', 'Access denied', HttpStatus.FORBIDDEN);
    }
    logger.error('Failed to remove place from collection', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to remove place from collection', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
