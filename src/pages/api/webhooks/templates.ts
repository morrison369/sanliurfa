import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import {
  createWebhookTemplate,
  getUserTemplates,
  applyTemplate,
  deleteTemplate,
  getPopularTemplates
} from '../../../lib/webhook-templates';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/templates?popular=true
 * List templates
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const popular = url.searchParams.get('popular') === 'true';

    let data;
    if (popular) {
      data = await getPopularTemplates(pool);
    } else {
      data = await getUserTemplates(pool, locals.user.id);
    }

    return apiResponse(
      { success: true, data, count: data.length },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Şablonlar alınamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Şablonlar alınamadı', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * POST /api/webhooks/templates
 * Create template
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const { name, event, settings, description, applyTo } = body;

    if (!name || !event) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Name and event required', HttpStatus.BAD_REQUEST);
    }

    // Create template
    const template = await createWebhookTemplate(
      pool,
      locals.user.id,
      name,
      event,
      settings,
      description
    );

    // Apply to webhook if specified
    let webhookId = null;
    if (applyTo && applyTo.webhookUrl) {
      webhookId = await applyTemplate(
        pool,
        locals.user.id,
        template.id,
        applyTo.webhookUrl,
        applyTo.filters
      );
    }

    logger.info('Şablon oluşturuldu', { templateId: template.id, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: { template, webhookId },
        message: 'Şablon başarıyla oluşturuldu'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    logger.error('Şablon oluşturulamadı', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Şablon oluşturulamadı', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * DELETE /api/webhooks/templates/:id
 * Delete template
 */
export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Oturum açmanız gerekiyor', HttpStatus.UNAUTHORIZED);
    }

    const { id } = params;

    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Template ID required', HttpStatus.BAD_REQUEST);
    }

    const deleted = await deleteTemplate(pool, id, locals.user.id);

    if (!deleted) {
      return apiError(ErrorCode.NOT_FOUND, 'Template not found', HttpStatus.NOT_FOUND);
    }

    logger.info('Şablon silindi', { templateId: id, userId: locals.user.id });

    return apiResponse(
      { success: true, message: 'Şablon silindi' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Şablon silinemedi', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Şablon silinemedi', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
