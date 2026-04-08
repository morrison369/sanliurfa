/**
 * Delete Specific Search from History
 * DELETE /api/search/history/[id]
 */

import type { APIRoute } from 'astro';
import { queryOne, query } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('DELETE', '/api/search/history/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = locals.user.id;
    const { id } = params;

    // Verify ownership
    const search = await queryOne(
      'SELECT id FROM user_searches WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!search) {
      recordRequest('DELETE', '/api/search/history/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Search not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Delete search
    await query('DELETE FROM user_searches WHERE id = $1 AND user_id = $2', [id, userId]);

    recordRequest('DELETE', '/api/search/history/[id]', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      message: 'Arama silindi'
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/search/history/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to delete search', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete search',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
