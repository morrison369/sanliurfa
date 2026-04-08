import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import {
  createWebhookFilter,
  getWebhookFilters,
  deleteWebhookFilter
} from '../../../lib/webhook-filters';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/filters?webhookId=xxx
 * List webhook filters
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

    const filters = await getWebhookFilters(pool, webhookId, locals.user.id);

    return apiResponse(
      {
        success: true,
        data: filters,
        count: filters.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to get webhook filters', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get filters', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * POST /api/webhooks/filters
 * Create webhook filter
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const { webhookId, filterType, filterKey, operator, filterValue } = body;

    if (!webhookId || !filterType || !filterKey || !operator) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Missing required fields', HttpStatus.BAD_REQUEST);
    }

    const filter = await createWebhookFilter(
      pool,
      webhookId,
      locals.user.id,
      filterType,
      filterKey,
      operator,
      filterValue
    );

    return apiResponse(
      {
        success: true,
        data: filter,
        message: 'Filter created successfully'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    logger.error('Failed to create webhook filter', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create filter', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * DELETE /api/webhooks/filters/:id
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
      return apiError(ErrorCode.VALIDATION_ERROR, 'Filter ID required', HttpStatus.BAD_REQUEST);
    }

    const deleted = await deleteWebhookFilter(pool, id, locals.user.id);

    if (!deleted) {
      return apiError(ErrorCode.NOT_FOUND, 'Filter not found', HttpStatus.NOT_FOUND);
    }

    return apiResponse(
      { success: true, message: 'Filter deleted' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to delete webhook filter', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to delete filter', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
