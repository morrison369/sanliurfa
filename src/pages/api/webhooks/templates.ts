import type { APIRoute } from 'astro';
import type { Pool } from 'pg';
import { pool as postgresPool } from '../../../lib/postgres';
import {
  createWebhookTemplate,
  getUserTemplates,
  applyTemplate,
  deleteTemplate,
  getPopularTemplates
} from '../../../lib/webhook/webhook-templates';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/templates?popular=true
 * List templates
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const popular = url.searchParams.get('popular') === 'true';

    const data = popular
      ? await getPopularTemplates(postgresPool as unknown as Pool)
      : await getUserTemplates(postgresPool as unknown as Pool, locals.user.id);

    return apiResponse(
      { success: true, data, count: data.length },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to get templates', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get templates', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * POST /api/webhooks/templates
 * Create template
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const body = await request.json();
    const { name, event, settings, description, applyTo } = body;

    if (!name || !event) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Name and event required', HttpStatus.BAD_REQUEST);
    }
    if (typeof name !== 'string' || name.length > 255) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'name 255 karakterden uzun olamaz', HttpStatus.BAD_REQUEST);
    }
    if (typeof event !== 'string' || event.length > 100 || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(event)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'event formatı geçersiz (örn: place.created)', HttpStatus.BAD_REQUEST);
    }
    if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 1000)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'description 1000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST);
    }
    if (settings !== undefined && JSON.stringify(settings).length > 100000) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'settings 100000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST);
    }

    // Create template
    const template = await createWebhookTemplate(
      postgresPool as unknown as Pool,
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
        postgresPool as unknown as Pool,
        locals.user.id,
        template.id,
        applyTo.webhookUrl,
        applyTo.filters
      );
    }

    logger.info('Template created', { templateId: template.id, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: { template, webhookId },
        message: 'Template created successfully'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    logger.error('Failed to create template', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create template', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * DELETE /api/webhooks/templates/:id
 * Delete template
 */
export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const { id } = params;

    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Template ID required', HttpStatus.BAD_REQUEST);
    }

    const deleted = await deleteTemplate(postgresPool as unknown as Pool, id, locals.user.id);

    if (!deleted) {
      return apiError(ErrorCode.NOT_FOUND, 'Template not found', HttpStatus.NOT_FOUND);
    }

    logger.info('Template deleted', { templateId: id, userId: locals.user.id });

    return apiResponse(
      { success: true, message: 'Template deleted' },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to delete template', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to delete template', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
