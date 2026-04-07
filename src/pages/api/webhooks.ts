import type { APIRoute } from 'astro';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../lib/api';
import { createWebhook, deleteWebhook, getUserWebhooks, getWebhookDeliveries } from '../../lib/webhooks';
import { logger } from '../../lib/logging';

/**
 * GET /api/webhooks - Kullanıcının webhooks'larını listele
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  // Authentication zorunlu
  if (!locals.user?.id) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Giriş gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  try {
    const webhooks = await getUserWebhooks(locals.user.id);
    return apiResponse({ webhooks }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Webhooks alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Webhooks alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

/**
 * POST /api/webhooks - Yeni webhook oluştur
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  if (!locals.user?.id) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Giriş gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  try {
    const body = await request.json();

    // Validasyon
    if (!body.name || !body.url || !Array.isArray(body.events) || body.events.length === 0) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'name, url ve events gerekli',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    // URL validasyonu
    try {
      new URL(body.url);
    } catch {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz URL',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const webhookId = await createWebhook(
      locals.user.id,
      body.name,
      body.url,
      body.events
    );

    if (!webhookId) {
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Webhook oluşturulurken hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    logger.info('Webhook oluşturuldu', { webhookId, userId: locals.user.id });

    return apiResponse(
      { webhookId, message: 'Webhook oluşturuldu' },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    logger.error('Webhook oluşturulurken hata', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Webhook oluşturulurken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

/**
 * DELETE /api/webhooks/:id - Webhook'u sil
 */
export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  if (!locals.user?.id) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Giriş gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  try {
    const { id } = params;

    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const success = await deleteWebhook(id, locals.user.id);

    if (!success) {
      return apiError(
        ErrorCode.NOT_FOUND,
        'Webhook bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    logger.info('Webhook silindi', { webhookId: id, userId: locals.user.id });

    return apiResponse(
      { message: 'Webhook silindi' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Webhook silinirken hata', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Webhook silinirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

/**
 * GET /api/webhooks/:id/deliveries - Webhook delivery geçmişi
 */
export const GET_DELIVERIES: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  if (!locals.user?.id) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Giriş gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
  }

  try {
    const { id } = params;

    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID gerekli', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const deliveries = await getWebhookDeliveries(id);

    return apiResponse(
      { deliveries, count: deliveries.length },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Webhook deliveries alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Webhook deliveries alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
