/**
 * User Search History
 * GET /api/search/history - List user's search history
 * DELETE /api/search/history - Clear search history
 */

import type { APIRoute } from 'astro';
import { queryRows, query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('GET', '/api/search/history', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = locals.user.id;
    const limit = 50;

    // Get search history
    const history = await queryRows(
      `SELECT id, query, filters, results_count, created_at
       FROM user_searches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    recordRequest('GET', '/api/search/history', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      data: history,
      count: history.length
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/search/history', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get search history', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get search history',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Auth required
    if (!locals.user) {
      recordRequest('DELETE', '/api/search/history', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const userId = locals.user.id;

    // Delete all searches for user
    const result = await query('DELETE FROM user_searches WHERE user_id = $1', [userId]);
    const deleted = result.rowCount || 0;

    recordRequest('DELETE', '/api/search/history', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      message: 'Arama geçmişi silindi',
      deletedCount: deleted
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/search/history', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to delete search history', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete search history',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
