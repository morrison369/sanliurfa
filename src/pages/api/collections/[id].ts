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
      return apiError(context, HttpStatus.BAD_REQUEST, 'Koleksiyon ID gereklidir');
    }

    const data = await getCollectionWithItems(id, context.locals.user?.id);

    if (!data) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Koleksiyon bulunamadı');
    }

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Koleksiyon alınamadı');
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Oturum açmanız gerekiyor');
    }

    const { id } = context.params;

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Koleksiyon ID gereklidir');
    }

    const body = await context.request.json();

    const updated = await updateCollection(id, context.locals.user.id, body);

    if (!updated) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Koleksiyon bulunamadı');
    }

    logger.info('Collection updated via API', { userId: context.locals.user.id, collectionId: id });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Koleksiyon güncellendi'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError(context, HttpStatus.FORBIDDEN, 'Erişim reddedildi');
    }
    logger.error('Failed to update collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Koleksiyon güncellenemedi');
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Oturum açmanız gerekiyor');
    }

    const { id } = context.params;

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Koleksiyon ID gereklidir');
    }

    const deleted = await deleteCollection(id, context.locals.user.id);

    if (!deleted) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Koleksiyon bulunamadı');
    }

    logger.info('Collection deleted via API', { userId: context.locals.user.id, collectionId: id });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Koleksiyon silindi'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError(context, HttpStatus.FORBIDDEN, 'Erişim reddedildi');
    }
    logger.error('Failed to delete collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Koleksiyon silinemedi');
  }
};
