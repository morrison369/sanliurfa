/**
 * Delete a saved search
 * DELETE /api/users/saved-searches/[id]
 */

import type { APIRoute } from 'astro';
import { deleteSavedSearch } from '../../../../lib/saved/saved-searches';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const userId = locals.user.id;
    const { id } = params;

    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Search ID is required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const deleted = await deleteSavedSearch(id, userId);

    if (!deleted) {
      return apiError(ErrorCode.NOT_FOUND, 'Saved search not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    logger.info('Saved search deleted', { userId, searchId: id });

    return apiResponse({ success: true, message: 'Arama silindi' }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to delete saved search', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to delete saved search', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
