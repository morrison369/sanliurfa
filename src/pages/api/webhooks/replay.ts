import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { requestEventReplay, getReplayHistory, cancelReplay } from '../../../lib/webhook-replay';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { enforceRateLimitPolicy, getClientIpAddress } from '../../../lib/sensitive-endpoint-policy';
import { recordRequest } from '../../../lib/metrics';

/**
 * POST /api/webhooks/replay
 * Request event replay
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/webhooks/replay', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const rateLimitResponse = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `webhook:replay:post:${getClientIpAddress(request)}:${locals.user.id}`,
      limit: 20,
      windowSeconds: 60,
      message: 'Too many replay requests',
    });

    if (rateLimitResponse) {
      recordRequest('POST', '/api/webhooks/replay', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return rateLimitResponse;
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      recordRequest('POST', '/api/webhooks/replay', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Content-Type must be application/json', HttpStatus.BAD_REQUEST);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      recordRequest('POST', '/api/webhooks/replay', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid JSON payload', HttpStatus.BAD_REQUEST);
    }

    const { webhookId, eventId } = body;

    if (!webhookId || !eventId) {
      recordRequest('POST', '/api/webhooks/replay', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID and Event ID required', HttpStatus.BAD_REQUEST);
    }

    const duplicateBurstResponse = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `webhook:replay:fingerprint:${getClientIpAddress(request)}:${locals.user.id}:${webhookId}:${eventId}`,
      limit: 1,
      windowSeconds: 20,
      message: 'Duplicate replay request detected. Please wait before retrying.',
    });

    if (duplicateBurstResponse) {
      recordRequest('POST', '/api/webhooks/replay', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return duplicateBurstResponse;
    }

    const replayRequest = await requestEventReplay(pool, webhookId, eventId, locals.user.id);

    logger.info('Event replay requested', {
      webhookId,
      eventId,
      userId: locals.user.id
    });

    recordRequest('POST', '/api/webhooks/replay', HttpStatus.CREATED, Date.now() - startTime);
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
    recordRequest('POST', '/api/webhooks/replay', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to request replay', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * GET /api/webhooks/replay?webhookId=xxx
 * Get replay history
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/webhooks/replay', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhookId');

    if (!webhookId) {
      recordRequest('GET', '/api/webhooks/replay', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    const history = await getReplayHistory(pool, webhookId, locals.user.id);

    recordRequest('GET', '/api/webhooks/replay', HttpStatus.OK, Date.now() - startTime);
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
    recordRequest('GET', '/api/webhooks/replay', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get history', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * DELETE /api/webhooks/replay/:id
 * Cancel pending replay
 */
export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', '/api/webhooks/replay', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const { id } = params;

    if (!id) {
      recordRequest('DELETE', '/api/webhooks/replay', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Replay ID required', HttpStatus.BAD_REQUEST);
    }

    const cancelled = await cancelReplay(pool, id, locals.user.id);

    if (!cancelled) {
      recordRequest('DELETE', '/api/webhooks/replay', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Replay not found or already processed', HttpStatus.NOT_FOUND);
    }

    logger.info('Event replay cancelled', { replayId: id, userId: locals.user.id });

    recordRequest('DELETE', '/api/webhooks/replay', HttpStatus.OK, Date.now() - startTime);
    return apiResponse(
      { success: true, message: 'Replay cancelled' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to cancel replay', error instanceof Error ? error : new Error(String(error)));
    recordRequest('DELETE', '/api/webhooks/replay', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to cancel replay', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
