/**
 * Collection detail endpoints
 * GET /api/collections/[id] — Get collection details with items
 * PUT /api/collections/[id] — Update collection
 * DELETE /api/collections/[id] — Delete collection
 */

import type { APIRoute } from 'astro';
import { getCollectionWithItems, updateCollection, deleteCollection } from '../../../lib/collections';
import { apiResponse, apiError, HttpStatus } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const { id } = context.params;

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Collection ID is required');
    }

    const data = await getCollectionWithItems(id, context.locals.user?.id);

    if (!data) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Collection not found');
    }

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to get collection');
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const { id } = context.params;

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Collection ID is required');
    }

    const body = await context.request.json();

    const updated = await updateCollection(id, context.locals.user.id, body);

    if (!updated) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Collection not found');
    }

    logger.info('Collection updated via API', { userId: context.locals.user.id, collectionId: id });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Koleksiyon güncellendi'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError(context, HttpStatus.FORBIDDEN, 'Access denied');
    }
    logger.error('Failed to update collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to update collection');
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const { id } = context.params;

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Collection ID is required');
    }

    const deleted = await deleteCollection(id, context.locals.user.id);

    if (!deleted) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Collection not found');
    }

    logger.info('Collection deleted via API', { userId: context.locals.user.id, collectionId: id });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Koleksiyon silindi'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError(context, HttpStatus.FORBIDDEN, 'Access denied');
    }
    logger.error('Failed to delete collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete collection');
  }
};
