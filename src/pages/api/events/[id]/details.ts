/**
 * Get Event Details
 * GET /api/events/[id]/details - Get detailed event information
 */

import type { APIRoute } from 'astro';
import { getEventById, hasUserRsvpd, getEventAttendees } from '../../../../lib/events/events-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = params;
    if (!id) {
      recordRequest('GET', '/api/events/[id]/details', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Event ID is required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const event = await getEventById(id);
    if (!event) {
      recordRequest('GET', '/api/events/[id]/details', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Event not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    let userHasRsvpd = false;
    let attendees: Awaited<ReturnType<typeof getEventAttendees>> = [];

    if (locals.user) {
      userHasRsvpd = await hasUserRsvpd(id, locals.user.id);
    }

    const includeAttendees = request.headers.get('x-include-attendees') === 'true';
    if (includeAttendees) {
      attendees = await getEventAttendees(id);
    }

    recordRequest('GET', '/api/events/[id]/details', HttpStatus.OK, Date.now() - startTime);

    const payload: {
      success: true;
      event: typeof event;
      userHasRsvpd: boolean;
      attendees?: Awaited<ReturnType<typeof getEventAttendees>>;
    } = {
      success: true,
      event,
      userHasRsvpd,
    };
    if (includeAttendees) {
      payload.attendees = attendees;
    }

    return apiResponse(payload, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/events/[id]/details', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get event details', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get event details',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
