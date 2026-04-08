/**
 * Badges API
 * GET: Get all badges or user badges
 */

import type { APIRoute } from 'astro';
import { getAllBadges, getUserBadges } from '../../../lib/badges';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    let badges: any[] = [];

    if (userId) {
      badges = await getUserBadges(userId);
    } else {
      badges = await getAllBadges();
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/badges', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          badges,
          count: badges.length
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/badges', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get badges failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Rozetler alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
