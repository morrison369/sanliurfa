/**
 * Security Guidelines & Recommendations (Admin)
 */

import type { APIRoute } from 'astro';
import {
  getAllGuidelines,
  getGuidelinesByCategory,
  getUnimplementedGuidelines,
  calculateSecurityScore,
  getCriticalItems
} from '../../../../lib/security-guidelines';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/security/guidelines', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const category = url.searchParams.get('category');
    const filter = url.searchParams.get('filter'); // 'all', 'unimplemented', 'critical'

    let data;

    if (filter === 'unimplemented') {
      data = getUnimplementedGuidelines();
    } else if (filter === 'critical') {
      data = getCriticalItems();
    } else if (category) {
      data = getGuidelinesByCategory(category);
    } else {
      data = getAllGuidelines();
    }

    const score = calculateSecurityScore();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/security/guidelines', HttpStatus.OK, duration);
    logger.info('Security guidelines retrieved', { filter, category, score: score.score });

    return apiResponse(
      {
        success: true,
        data: {
          guidelines: data,
          score,
          timestamp: new Date().toISOString()
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/security/guidelines', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get security guidelines failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
