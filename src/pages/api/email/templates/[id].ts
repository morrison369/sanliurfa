/**
 * Email Template Detail API
 * GET: Get template
 * PUT: Update template
 * DELETE: Delete template
 */

import type { APIRoute } from 'astro';
import { queryOne, update, query } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id: templateId } = params;
    if (!templateId) {
      recordRequest('GET', '/api/email/templates/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Template ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Optimized: select specific columns instead of SELECT *
    const template = await queryOne(
      `SELECT id, name, subject_line, html_content, plain_text_content, preview_text,
              is_active, created_at, updated_at FROM email_templates WHERE id = $1`,
      [templateId]
    );

    if (!template) {
      recordRequest('GET', '/api/email/templates/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Template not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/templates/[id]', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: template,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/templates/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get template failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get template',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: templateId } = params;
    if (!templateId) {
      recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Template ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const template = await queryOne('SELECT created_by_user_id FROM email_templates WHERE id = $1', [templateId]);
    if (!template || template.created_by_user_id !== locals.user.id) {
      recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { name, subject_line, html_content, plain_text_content, preview_text, is_active } = body;

    if (name !== undefined && (typeof name !== 'string' || name.length > 200)) {
      recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Ad 200 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (subject_line !== undefined && (typeof subject_line !== 'string' || subject_line.length > 500)) {
      recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Konu satırı 500 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (html_content !== undefined && (typeof html_content !== 'string' || html_content.length > 500000)) {
      recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'HTML içerik 500000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (plain_text_content !== undefined && plain_text_content !== null && (typeof plain_text_content !== 'string' || plain_text_content.length > 500000)) {
      recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Düz metin 500000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (preview_text !== undefined && preview_text !== null && (typeof preview_text !== 'string' || preview_text.length > 500)) {
      recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Önizleme metni 500 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const updated = await update('email_templates', { id: templateId }, {
      name,
      subject_line,
      html_content,
      plain_text_content,
      preview_text,
      is_active,
      updated_at: new Date(),
    });

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.OK, duration);

    logger.info('Email template updated', { id: templateId, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: updated,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/email/templates/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update template failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update template',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('DELETE', '/api/email/templates/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { id: templateId } = params;
    if (!templateId) {
      recordRequest('DELETE', '/api/email/templates/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Template ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Verify ownership
    const template = await queryOne('SELECT created_by_user_id FROM email_templates WHERE id = $1', [templateId]);
    if (!template || template.created_by_user_id !== locals.user.id) {
      recordRequest('DELETE', '/api/email/templates/[id]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    await query('DELETE FROM email_templates WHERE id = $1', [templateId]);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/email/templates/[id]', HttpStatus.OK, duration);

    logger.info('Email template deleted', { id: templateId, userId: locals.user.id });

    return apiResponse(
      {
        success: true,
        message: 'Template deleted',
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/email/templates/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Delete template failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete template',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
