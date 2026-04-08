/**
 * Review Responses API
 * GET: List responses for a review
 * POST: Add response (owner only)
 * PUT: Update response
 * DELETE: Delete response
 */

import type { APIRoute } from 'astro';
import {
  getReviewResponses,
  addReviewResponse,
  updateReviewResponse,
  deleteReviewResponse
} from '../../../../lib/review-management';
import { queryOne } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: reviewId } = params;
    if (!reviewId) {
      recordRequest('GET', '/api/reviews/[id]/responses', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Review ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const responses = await getReviewResponses(reviewId);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reviews/[id]/responses', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: responses, count: responses.length },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reviews/[id]/responses', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get responses failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get responses', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/reviews/[id]/responses', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: reviewId } = params;
    if (!reviewId) {
      recordRequest('POST', '/api/reviews/[id]/responses', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Review ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const body = await request.json();
    const { place_id, response_text } = body;

    if (!place_id || !response_text) {
      recordRequest('POST', '/api/reviews/[id]/responses', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'place_id and response_text required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const response = await addReviewResponse(reviewId, place_id, locals.user.id, response_text);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/[id]/responses', HttpStatus.CREATED, duration);

    return apiResponse(
      { success: true, data: response },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/[id]/responses', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Add response failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to add response', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/reviews/[id]/responses', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { response_id, response_text } = body;

    if (!response_id || !response_text) {
      recordRequest('PUT', '/api/reviews/[id]/responses', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'response_id and response_text required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const updated = await updateReviewResponse(response_id, locals.user.id, response_text);

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/reviews/[id]/responses', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: updated },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/reviews/[id]/responses', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update response failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to update response', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', '/api/reviews/[id]/responses', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { response_id } = body;

    if (!response_id) {
      recordRequest('DELETE', '/api/reviews/[id]/responses', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'response_id required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const deleted = await deleteReviewResponse(response_id, locals.user.id);

    if (!deleted) {
      recordRequest('DELETE', '/api/reviews/[id]/responses', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Response not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/reviews/[id]/responses', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, message: 'Response deleted' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/reviews/[id]/responses', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Delete response failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to delete response', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
