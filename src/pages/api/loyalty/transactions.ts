/**
 * API: Loyalty Transactions
 * GET - User's loyalty transaction history
 */
import type { APIRoute } from 'astro';
import { queryMany } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/loyalty/transactions', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const type = url.searchParams.get('type');

    let query = `
      SELECT
        id,
        transaction_type,
        points_amount,
        transaction_reason,
        balance_before,
        balance_after,
        expires_at,
        is_expired,
        created_at
      FROM loyalty_transactions
      WHERE user_id = $1
    `;

    const params: any[] = [locals.user.id];

    if (type) {
      query += ` AND transaction_type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const transactions = await queryMany(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM loyalty_transactions WHERE user_id = $1';
    const countParams: any[] = [locals.user.id];

    if (type) {
      countQuery += ` AND transaction_type = $${countParams.length + 1}`;
      countParams.push(type);
    }

    const countResult = await queryMany(countQuery, countParams);
    const total = parseInt(countResult[0]?.count || '0');

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/transactions', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          transactions,
          pagination: {
            limit,
            offset,
            total
          }
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/loyalty/transactions', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get transactions', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
