/**
 * Collaboration Sessions Endpoint
 * Create and manage collaborative editing sessions
 */

import type { APIRoute } from 'astro';
import { createCollaborationSession, getCollaborationSession, addParticipant, removeParticipant, getActiveParticipants, getCollaborationStats } from '../../../lib/collaborative-editing';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { content_id, max_participants } = body;

    if (!content_id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Content ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const session = await createCollaborationSession(content_id, locals.user.id, max_participants || 10);

    if (!session) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create session', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    return apiResponse({ success: true, data: session }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Failed to create session', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    const sessionToken = url.searchParams.get('token');

    if (!sessionToken) {
      if (!locals.isAdmin) {
        return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
      }

      const stats = await getCollaborationStats();
      return apiResponse({ success: true, data: stats }, HttpStatus.OK, requestId);
    }

    const session = await getCollaborationSession(sessionToken);
    if (!session) {
      return apiError(ErrorCode.NOT_FOUND, 'Session not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const participants = await getActiveParticipants(session.id);

    return apiResponse({
      success: true,
      data: { session, participants }
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get session', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
