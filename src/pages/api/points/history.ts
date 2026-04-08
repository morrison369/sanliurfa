import type { APIRoute } from 'astro';
import { getPointsHistory } from '../../../lib/gamification';
import { verifyToken } from '../../../lib/auth';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, cookies }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Verify authentication
    const token = cookies.get('auth-token')?.value;
    if (!token) {
      recordRequest('GET', '/api/points/history', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const sessionData = await verifyToken(token);
    if (!sessionData) {
      recordRequest('GET', '/api/points/history', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Invalid or expired token', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    // Get points history
    const history = await getPointsHistory(sessionData.userId, limit);

    // Record metrics
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/points/history', HttpStatus.OK, duration);
    logger.info('Points history fetched', { userId: sessionData.userId, limit, duration });

    return apiResponse(
      {
        success: true,
        data: {
          userId: sessionData.userId,
          history
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/points/history', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: error instanceof Error ? error.message : String(error)
    });
    logger.error('Points history request failed', error instanceof Error ? error : new Error(String(error)), {
      duration
    });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch points history', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
