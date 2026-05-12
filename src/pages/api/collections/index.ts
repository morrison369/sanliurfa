/**
 * Collections endpoints
 * GET /api/collections — List public collections or user collections
 * POST /api/collections — Create new collection
 */

import type { APIRoute } from 'astro';
import { getUserCollections, createCollection, getPublicCollections } from '../../../lib/collections';
import { apiResponse, apiError, HttpStatus, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const { userId, public: isPublic, limit, offset } = Object.fromEntries(context.url.searchParams);

    // If userId parameter, get that user's collections
    if (userId) {
      const result = await getUserCollections(userId, { limit: safeIntParam(limit, 50, 1, 200) });
      return apiResponse({
        success: true,
        data: result.collections,
        count: result.total
      }, HttpStatus.OK);
    }

    // If public flag, get public collections
    if (isPublic === 'true') {
      const result = await getPublicCollections(safeIntParam(limit, 20, 1, 200), safeIntParam(offset, 0, 0, 1_000_000));
      return apiResponse({
        success: true,
        data: result.collections,
        count: result.total
      }, HttpStatus.OK);
    }

    // Default: if authenticated, get user's collections
    if (context.locals.user) {
      const result = await getUserCollections(context.locals.user.id);
      return apiResponse({
        success: true,
        data: result.collections,
        count: result.total
      }, HttpStatus.OK);
    }

    return apiError('UNAUTHORIZED', 'Authentication required', HttpStatus.UNAUTHORIZED);
  } catch (error) {
    logger.error('Failed to get collections', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to get collections', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const POST: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError('UNAUTHORIZED', 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const body = await context.request.json();

    if (!body.name || typeof body.name !== 'string') {
      return apiError('VALIDATION_ERROR', 'Collection name is required', HttpStatus.BAD_REQUEST);
    }

    if (body.name.length > 100) {
      return apiError('VALIDATION_ERROR', 'Name is too long (max 100 characters)', HttpStatus.BAD_REQUEST);
    }
    if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 1000)) {
      return apiError('VALIDATION_ERROR', 'Açıklama 1000 karakteri aşamaz', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (body.icon !== undefined && body.icon !== null && (typeof body.icon !== 'string' || body.icon.length > 500)) {
      return apiError('VALIDATION_ERROR', 'Icon 500 karakteri aşamaz', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const collection = await createCollection(
      context.locals.user.id,
      body.name,
      body.description || undefined,
      body.icon || undefined,
      body.is_public || false
    );

    logger.info('Collection created via API', { userId: context.locals.user.id, collectionId: collection.id });

    return apiResponse({
      success: true,
      message: 'Koleksiyon oluşturuldu',
      data: collection
    }, HttpStatus.CREATED);
  } catch (error) {
    logger.error('Failed to create collection', error instanceof Error ? error : new Error(String(error)));
    return apiError('INTERNAL_ERROR', 'Failed to create collection', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

