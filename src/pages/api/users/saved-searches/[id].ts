/**
 * Delete a saved search
 * DELETE /api/users/saved-searches/[id]
 */

import type { APIRoute } from 'astro';
import { deleteSavedSearch } from '../../../../lib/saved-searches';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const DELETE: APIRoute = async (context) => {
  try {
    // Auth required
    if (!context.locals.user) {
      return apiError(context, HttpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const userId = context.locals.user.id;
    const { id } = context.params;

    if (!id) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'Search ID is required');
    }

    // Delete saved search
    const deleted = await deleteSavedSearch(id, userId);

    if (!deleted) {
      return apiError(context, HttpStatus.NOT_FOUND, 'Saved search not found');
    }

    logger.info('Saved search deleted', { userId, searchId: id });

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      message: 'Arama silindi'
    });
  } catch (error) {
    logger.error('Failed to delete saved search', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete saved search');
  }
};
