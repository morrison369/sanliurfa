import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { getWebhookSettings, updateWebhookSettings } from '../../../lib/webhook-filters';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/settings?webhookId=xxx
 * Get webhook settings
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

    const settings = await getWebhookSettings(pool, webhookId, locals.user.id);

    return apiResponse(
      { success: true, data: settings },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to get webhook settings', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get settings', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * PUT /api/webhooks/settings
 * Update webhook settings
 */
export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const { webhookId, ...settings } = body;

    if (!webhookId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    // Validate settings
    if (settings.timeoutSeconds !== undefined && settings.timeoutSeconds < 5) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Timeout must be at least 5 seconds', HttpStatus.BAD_REQUEST);
    }

    if (settings.maxRetries !== undefined && settings.maxRetries < 0) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Max retries must be non-negative', HttpStatus.BAD_REQUEST);
    }

    const updated = await updateWebhookSettings(pool, webhookId, locals.user.id, settings);

    logger.info('Webhook settings updated', { webhookId, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: updated,
        message: 'Settings updated successfully'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to update webhook settings', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to update settings', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
