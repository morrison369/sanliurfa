import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { requestEventReplay, getReplayHistory, cancelReplay } from '../../../lib/webhook-replay';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * POST /api/webhooks/replay
 * Request event replay
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const { webhookId, eventId } = body;

    if (!webhookId || !eventId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID and Event ID required', HttpStatus.BAD_REQUEST);
    }

    const replayRequest = await requestEventReplay(pool, webhookId, eventId, locals.user.id);

    logger.info('Event replay requested', {
      webhookId,
      eventId,
      userId: locals.user.id
    });

    return apiResponse(
      {
        success: true,
        data: replayRequest,
        message: 'Event replay queued'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    logger.error('Failed to request event replay', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to request replay', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * GET /api/webhooks/replay?webhookId=xxx
 * Get replay history
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhookId');

    if (!webhookId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    const history = await getReplayHistory(pool, webhookId, locals.user.id);

    return apiResponse(
      {
        success: true,
        data: history,
        count: history.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to get replay history', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get history', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * DELETE /api/webhooks/replay/:id
 * Cancel pending replay
 */
export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const { id } = params;

    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Replay ID required', HttpStatus.BAD_REQUEST);
    }

    const cancelled = await cancelReplay(pool, id, locals.user.id);

    if (!cancelled) {
      return apiError(ErrorCode.NOT_FOUND, 'Replay not found or already processed', HttpStatus.NOT_FOUND);
    }

    logger.info('Event replay cancelled', { replayId: id, userId: locals.user.id });

    return apiResponse(
      { success: true, message: 'Replay cancelled' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to cancel replay', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to cancel replay', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
