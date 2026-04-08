import type { APIRoute } from 'astro';
import { getLeaderboard } from '../../lib/gamification';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { recordRequest } from '../../lib/metrics';
import { logger } from '../../lib/logging';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Get query parameters
    const url = new URL(request.url);
    const period = (url.searchParams.get('period') || 'all') as 'weekly' | 'monthly' | 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);

    // Validate period
    if (!['weekly', 'monthly', 'all'].includes(period)) {
      recordRequest('GET', '/api/leaderboard', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid period parameter', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Get leaderboard
    const leaderboard = await getLeaderboard(limit, period);

    // Record metrics
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/leaderboard', HttpStatus.OK, duration);
    logger.info('Leaderboard fetched', { period, limit, duration });

    return apiResponse(
      {
        success: true,
        data: {
          period,
          limit,
          leaderboard
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/leaderboard', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: error instanceof Error ? error.message : String(error)
    });
    logger.error('Leaderboard request failed', error instanceof Error ? error : new Error(String(error)), {
      duration
    });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch leaderboard', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
