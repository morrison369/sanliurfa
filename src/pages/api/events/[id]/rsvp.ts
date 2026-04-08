/**
 * Toggle Event RSVP
 * POST /api/events/[id]/rsvp - Toggle RSVP for an event
 */

import type { APIRoute } from 'astro';
import { toggleRsvp, hasUserRsvpd } from '../../../../lib/events-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const POST: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('POST', '/api/events/[id]/rsvp', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const { id } = params;
    const userId = locals.user.id;

    const success = await toggleRsvp(id, userId);

    if (!success) {
      throw new Error('Failed to toggle RSVP');
    }

    const nowRsvpd = await hasUserRsvpd(id, userId);

    recordRequest('POST', '/api/events/[id]/rsvp', HttpStatus.OK, Date.now() - startTime);

    logger.logMutation('rsvp_toggle', 'events', id, userId, { rsvpd: nowRsvpd });

    return apiResponse({
      success: true,
      rsvpd: nowRsvpd,
      message: nowRsvpd ? 'Etkinliğe katılım sağlandı' : 'Etkinlikten çıkıldı'
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/events/[id]/rsvp', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to toggle RSVP', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to toggle RSVP',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
