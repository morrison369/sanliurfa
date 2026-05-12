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
      return apiError('VALIDATION_ERROR', 'Collection ID is required', HttpStatus.BAD_REQUEST);
    }

    const data = await getCollectionWithItems(id, context.locals.user?.id);

    if (!data) {
      return apiError('NOT_FOUND', 'Collection not found', HttpStatus.NOT_FOUND);
    }

    return apiResponse({ success: true, data }, HttpStatus.OK);
  } catch (error) {
    logger.error('Failed to get collection', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to get collection', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError('UNAUTHORIZED', 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const { id } = context.params;

    if (!id) {
      return apiError('VALIDATION_ERROR', 'Collection ID is required', HttpStatus.BAD_REQUEST);
    }

    const body = await context.request.json();
    const { name, description, icon, is_public } = body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.length > 200) return apiError('VALIDATION_ERROR', 'Koleksiyon adı 200 karakterden uzun olamaz', HttpStatus.BAD_REQUEST);
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 2000) return apiError('VALIDATION_ERROR', 'Açıklama 2000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST);
    }
    if (icon !== undefined) {
      if (typeof icon !== 'string' || icon.length > 200) return apiError('VALIDATION_ERROR', 'İkon 200 karakterden uzun olamaz', HttpStatus.BAD_REQUEST);
    }
    if (is_public !== undefined && typeof is_public !== 'boolean') {
      return apiError('VALIDATION_ERROR', 'is_public boolean olmalıdır', HttpStatus.BAD_REQUEST);
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (is_public !== undefined) updates.is_public = is_public;

    const updated = await updateCollection(id, context.locals.user.id, updates);

    if (!updated) {
      return apiError('NOT_FOUND', 'Collection not found', HttpStatus.NOT_FOUND);
    }

    logger.info('Collection updated via API', { userId: context.locals.user.id, collectionId: id });

    return apiResponse({ success: true, message: 'Koleksiyon güncellendi' }, HttpStatus.OK);
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError('FORBIDDEN', 'Access denied', HttpStatus.FORBIDDEN);
    }
    logger.error('Failed to update collection', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to update collection', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError('UNAUTHORIZED', 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const { id } = context.params;

    if (!id) {
      return apiError('VALIDATION_ERROR', 'Collection ID is required', HttpStatus.BAD_REQUEST);
    }

    await deleteCollection(id, context.locals.user.id);

    logger.info('Collection deleted via API', { userId: context.locals.user.id, collectionId: id });

    return apiResponse({ success: true, message: 'Koleksiyon silindi' }, HttpStatus.OK);
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return apiError('FORBIDDEN', 'Access denied', HttpStatus.FORBIDDEN);
    }
    logger.error('Failed to delete collection', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to delete collection', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
