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

    // @ts-expect-error - apiResponse signature mismatch
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
    const { name, description, icon, is_public } = body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.length > 200) return apiError(context, HttpStatus.BAD_REQUEST, 'Koleksiyon adı 200 karakterden uzun olamaz');
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 2000) return apiError(context, HttpStatus.BAD_REQUEST, 'Açıklama 2000 karakterden uzun olamaz');
    }
    if (icon !== undefined) {
      if (typeof icon !== 'string' || icon.length > 200) return apiError(context, HttpStatus.BAD_REQUEST, 'İkon 200 karakterden uzun olamaz');
    }
    if (is_public !== undefined && typeof is_public !== 'boolean') {
      return apiError(context, HttpStatus.BAD_REQUEST, 'is_public boolean olmalıdır');
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (is_public !== undefined) updates.is_public = is_public;

    const updated = await updateCollection(id, context.locals.user.id, updates);

    if (!updated) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Collection not found');
    }

    logger.info('Collection updated via API', { userId: context.locals.user.id, collectionId: id });

    // @ts-expect-error - apiResponse signature mismatch
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

    await deleteCollection(id, context.locals.user.id);

    logger.info('Collection deleted via API', { userId: context.locals.user.id, collectionId: id });

    return apiResponse({ success: true, message: 'Koleksiyon silindi' }, HttpStatus.OK);
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError(context, HttpStatus.FORBIDDEN, 'Access denied');
    }
    logger.error('Failed to delete collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete collection');
  }
};

