/**
 * Collection items endpoints
 * POST /api/collections/[id]/items — Add place to collection
 * DELETE /api/collections/[id]/items?placeId=xxx — Remove place from collection
 */

import type { APIRoute } from 'astro';
import { addPlaceToCollection, removePlaceFromCollection } from '../../../../lib/collections';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const { id } = context.params;

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Collection ID is required');
    }

    const body = await context.request.json();

    if (!body.placeId || typeof body.placeId !== 'string') {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Place ID is required');
    }

    const itemId = await addPlaceToCollection(id, body.placeId, context.locals.user.id, body.note || undefined);

    logger.info('Place added to collection', {
      userId: context.locals.user.id,
      collectionId: id,
      placeId: body.placeId
    });

    return apiResponse(context, HttpStatus.CREATED, {
      success: true,
      message: 'Yer koleksiyona eklendi',
      itemId
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError(context, HttpStatus.FORBIDDEN, 'Access denied');
    }
    logger.error('Failed to add place to collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to add place to collection');
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const { id } = context.params;
    const { placeId } = Object.fromEntries(context.url.searchParams);

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Collection ID is required');
    }

    if (!placeId) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Place ID is required');
    }

    const removed = await removePlaceFromCollection(id, placeId, context.locals.user.id);

    if (!removed) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Place not found in collection');
    }

    logger.info('Place removed from collection', {
      userId: context.locals.user.id,
      collectionId: id,
      placeId
    });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Yer koleksiyondan kaldırıldı'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError(context, HttpStatus.FORBIDDEN, 'Access denied');
    }
    logger.error('Failed to remove place from collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to remove place from collection');
  }
};
