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

    if (body.note !== undefined && body.note !== null) {
      if (typeof body.note !== 'string' || body.note.length > 500) {
        return apiError(context, HttpStatus.BAD_REQUEST, 'note 500 karakterden uzun olamaz');
      }
    }

    await addPlaceToCollection(id, body.placeId, context.locals.user.id, body.note || undefined);

    logger.info('Place added to collection', {
      userId: context.locals.user.id,
      collectionId: id,
      placeId: body.placeId
    });

    return apiResponse({ success: true, message: 'Yer koleksiyona eklendi' }, HttpStatus.CREATED);
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

    await removePlaceFromCollection(id, placeId, context.locals.user.id);

    logger.info('Place removed from collection', {
      userId: context.locals.user.id,
      collectionId: id,
      placeId
    });

    return apiResponse({ success: true, message: 'Yer koleksiyondan kaldırıldı' }, HttpStatus.OK);
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError(context, HttpStatus.FORBIDDEN, 'Access denied');
    }
    logger.error('Failed to remove place from collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to remove place from collection');
  }
};
