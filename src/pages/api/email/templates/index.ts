/**
 * Email Templates API
 * GET: List templates
 * POST: Create template
 */

import type { APIRoute } from 'astro';
import { queryRows, insert } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/templates', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const templates = await queryRows(`
      SELECT id, name, slug, template_type, subject_line, preview_text,
        is_system_template, is_active, usage_count, created_at, updated_at
      FROM email_templates
      WHERE is_system_template = true OR created_by_user_id = $1
      ORDER BY created_at DESC
    `, [locals.user.id]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/templates', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: templates,
        count: templates.length,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/email/templates', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get templates failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get templates',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/email/templates', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { name, slug, template_type, subject_line, html_content, plain_text_content, preview_text } = body;

    if (!name || !slug || !template_type || !subject_line || !html_content) {
      recordRequest('POST', '/api/email/templates', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const template = await insert('email_templates', {
      name,
      slug,
      template_type,
      subject_line,
      html_content,
      plain_text_content: plain_text_content || null,
      preview_text: preview_text || null,
      created_by_user_id: locals.user.id,
      is_system_template: false,
      is_active: true,
      usage_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/templates', HttpStatus.CREATED, duration);

    logger.info('Email template created', { id: template.id, userId: locals.user.id, name });

    return apiResponse(
      {
        success: true,
        data: template,
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/email/templates', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Create template failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create template',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
