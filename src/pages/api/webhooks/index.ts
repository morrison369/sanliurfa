/**
 * Webhook Management API
 * GET: List user webhooks
 * POST: Register new webhook
 */

import type { APIRoute } from 'astro';
import { registerWebhook, getUserWebhooks } from '../../../lib/webhook';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { validateExternalUrl } from '../../../lib/security/safe-url';

export const GET: APIRoute = async ({ locals }) => {
  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const webhooks = await getUserWebhooks(locals.user.id);

    return apiResponse(
      {
        success: true,
        data: webhooks,
        count: webhooks.length
      },
      HttpStatus.OK
    );
  } catch (error) {
    logger.error('Get webhooks failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get webhooks', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const { event, url, secret } = body;

    if (!event || !url) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Event and URL required', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (typeof event !== 'string' || event.length > 100) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Event adı 100 karakteri aşamaz', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(event)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Event formatı geçersiz (örn: place.created)', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (secret !== undefined && secret !== null && (typeof secret !== 'string' || secret.length > 1000)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Secret 1000 karakteri aşamaz', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const urlCheck = validateExternalUrl(url);
    if (!urlCheck.ok) {
      logger.warn('Webhook registration rejected: unsafe URL', {
        userId: locals.user.id,
        reason: urlCheck.reason,
      });
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Webhook URL kabul edilmedi (private IP, internal port veya geçersiz protokol)',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const webhook = await registerWebhook(locals.user.id, event, url, secret);

    return apiResponse(
      {
        success: true,
        data: webhook,
        message: 'Webhook registered successfully'
      },
      HttpStatus.CREATED
    );
  } catch (error) {
    logger.error('Register webhook failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to register webhook', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
