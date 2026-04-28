/**
 * Security Events Endpoint
 * View security audit trail and suspicious activities
 */

import type { APIRoute } from 'astro';
import { getSecurityEvents, getSuspiciousActivities } from '../../../lib/security';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const suspicious = url.searchParams.get('suspicious') === 'true';
    const eventType = url.searchParams.get('type');
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 0, 1_000_000);

    const events = suspicious
      ? await getSuspiciousActivities(locals.user.id, limit)
      : await getSecurityEvents(locals.user.id, eventType || undefined, limit);

    return apiResponse({
      success: true,
      data: {
        events: events,
        count: events.length
      }
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get security events', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
