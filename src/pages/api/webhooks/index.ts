/**
 * Webhook Management API
 * GET: List user webhooks
 * POST: Register new webhook
 */

import type { APIRoute } from 'astro';
import { registerWebhook, getUserWebhooks } from '../../../lib/webhooks';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ locals }) => {
  try {
    if (!locals.user) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED);
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
    return apiError(ErrorCode.INTERNAL_ERROR, 'Webhooklar alınamadı', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const { event, url, secret } = body;

    if (!event || !url) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Event and URL required', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const webhook = await registerWebhook(locals.user.id, event, url, secret);

    return apiResponse(
      {
        success: true,
        data: webhook,
        message: 'Webhook başarıyla kaydedildi'
      },
      HttpStatus.CREATED
    );
  } catch (error) {
    logger.error('Register webhook failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Webhook kaydedilemedi', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
