/**
 * Collections endpoints
 * GET /api/collections — List public collections or user collections
 * POST /api/collections — Create new collection
 */

import type { APIRoute } from 'astro';
import { getUserCollections, createCollection, getPublicCollections } from '../../../lib/collections';
import { apiResponse, apiError, HttpStatus } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const { userId, public: isPublic, limit, offset } = Object.fromEntries(context.url.searchParams);

    // If userId parameter, get that user's collections
    if (userId) {
      const collections = await getUserCollections(userId, limit ? parseInt(limit) : 50);
      return apiResponse(context, HttpStatus.OK, {
        success: true,
        data: collections,
        count: collections.length
      });
    }

    // If public flag, get public collections
    if (isPublic === 'true') {
      const collections = await getPublicCollections(limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0);
      return apiResponse(context, HttpStatus.OK, {
        success: true,
        data: collections,
        count: collections.length
      });
    }

    // Default: if authenticated, get user's collections
    if (context.locals.user) {
      const collections = await getUserCollections(context.locals.user.id);
      return apiResponse(context, HttpStatus.OK, {
        success: true,
        data: collections,
        count: collections.length
      });
    }

    return apiError(context, HttpStatus.UNAUTHORIZED, 'Oturum açmanız gerekiyor');
  } catch (error) {
    logger.error('Failed to get collections', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Koleksiyonlar alınamadı');
  }
};

export const POST: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Oturum açmanız gerekiyor');
    }

    const body = await context.request.json();

    if (!body.name || typeof body.name !== 'string') {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Koleksiyon adı gereklidir');
    }

    if (body.name.length > 100) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Koleksiyon adı en fazla 100 karakter olabilir');
    }

    const collection = await createCollection(
      context.locals.user.id,
      body.name,
      body.description || undefined,
      body.icon || undefined,
      body.is_public || false
    );

    logger.info('Collection created via API', { userId: context.locals.user.id, collectionId: collection.id });

    return apiResponse(context, HttpStatus.CREATED, {
      success: true,
      message: 'Koleksiyon oluşturuldu',
      data: collection
    });
  } catch (error) {
    logger.error('Failed to create collection', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Koleksiyon oluşturulamadı');
  }
};
