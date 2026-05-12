/**
 * Email Templates API
 * GET: List templates
 * POST: Create template
 */

import type { APIRoute } from 'astro';
import { queryMany, insert } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/email/templates', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const templates = await queryMany(`
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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/email/templates', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { name, slug, template_type, subject_line, html_content, plain_text_content, preview_text } = body;

    if (!name || !slug || !template_type || !subject_line || !html_content || typeof name !== 'string' || typeof slug !== 'string' || typeof subject_line !== 'string' || typeof html_content !== 'string') {
      recordRequest('POST', '/api/email/templates', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'Zorunlu alanlar eksik', HttpStatus.BAD_REQUEST, undefined, requestId);
    }
    if (name.length > 200) return apiError(ErrorCode.VALIDATION_ERROR, 'Ad 200 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    if (slug.length > 200) return apiError(ErrorCode.VALIDATION_ERROR, 'Slug 200 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    const VALID_TEMPLATE_TYPES = new Set(['transactional', 'marketing', 'notification', 'system']);
    if (typeof template_type !== 'string' || !VALID_TEMPLATE_TYPES.has(template_type)) return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz şablon tipi', HttpStatus.BAD_REQUEST, undefined, requestId);
    if (subject_line.length > 500) return apiError(ErrorCode.VALIDATION_ERROR, 'Konu satırı 500 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    if (html_content.length > 500000) return apiError(ErrorCode.VALIDATION_ERROR, 'HTML içerik 500000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    if (plain_text_content !== undefined && plain_text_content !== null && (typeof plain_text_content !== 'string' || plain_text_content.length > 500000)) return apiError(ErrorCode.VALIDATION_ERROR, 'Düz metin 500000 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    if (preview_text !== undefined && preview_text !== null && (typeof preview_text !== 'string' || preview_text.length > 500)) return apiError(ErrorCode.VALIDATION_ERROR, 'Önizleme metni 500 karakterden uzun olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);

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
