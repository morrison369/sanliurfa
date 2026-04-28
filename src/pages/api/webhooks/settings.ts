import type { APIRoute } from 'astro';
import type { Pool } from 'pg';
import { pool } from '../../../lib/postgres';
import { getWebhookSettings, updateWebhookSettings } from '../../../lib/webhook/webhook-filters';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/settings?webhookId=xxx
 * Get webhook settings
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhookId');

    if (!webhookId) {
      return apiError(ErrorCode.INVALID_INPUT, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    const settings = await getWebhookSettings(pool as unknown as Pool, webhookId, locals.user.id);

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
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const { webhookId } = body;

    if (!webhookId) {
      return apiError(ErrorCode.INVALID_INPUT, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    // Allowlist: only permit known settings keys (HARD RULE #51)
    const ALLOWED_SETTINGS_KEYS = new Set(['timeoutSeconds', 'maxRetries', 'retryDelayMs', 'active']);
    const settings: Record<string, unknown> = {};
    for (const key of ALLOWED_SETTINGS_KEYS) {
      if (body[key] !== undefined) settings[key] = body[key];
    }

    // Validate settings
    if (settings.timeoutSeconds !== undefined) {
      if (!Number.isFinite(Number(settings.timeoutSeconds)) || Number(settings.timeoutSeconds) < 5) {
        return apiError(ErrorCode.INVALID_INPUT, 'Timeout en az 5 saniye olmalı ve geçerli sayı olmalı', HttpStatus.BAD_REQUEST);
      }
    }
    if (settings.maxRetries !== undefined) {
      if (!Number.isFinite(Number(settings.maxRetries)) || Number(settings.maxRetries) < 0) {
        return apiError(ErrorCode.INVALID_INPUT, 'maxRetries sıfır veya daha büyük geçerli sayı olmalı', HttpStatus.BAD_REQUEST);
      }
    }

    const updated = await updateWebhookSettings(pool as unknown as Pool, webhookId, locals.user.id, settings);

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
