/**
 * Export Templates API
 * Manage custom export templates
 */

import type { APIRoute } from 'astro';
import { getExportTemplates, createExportTemplate } from '../../../lib/report-engine';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const templateSchema = {
  name: { type: 'string' as const, required: true, minLength: 1, maxLength: 255 },
  export_format: { type: 'string' as const, required: true, pattern: '^(csv|json|excel)$' },
  columns: { type: 'string' as const }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/export-templates', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const templates = await getExportTemplates(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/export-templates', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: templates,
        count: templates.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/export-templates', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get export templates',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get export templates',
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
      recordRequest('POST', '/api/export-templates', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, templateSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/export-templates', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid template data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    // Parse columns if provided as string
    let columns: string[] = [];
    if (body.columns) {
      if (typeof body.columns === 'string') {
        columns = body.columns.split(',').map((c: string) => c.trim());
      } else if (Array.isArray(body.columns)) {
        columns = body.columns;
      }
    }

    const template = await createExportTemplate(
      locals.user.id,
      validation.data.name,
      validation.data.export_format,
      columns,
      body.filters || {}
    );

    if (!template) {
      recordRequest('POST', '/api/export-templates', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create template',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/export-templates', HttpStatus.CREATED, duration);
    logger.info('Export template created', { template_id: template.id, user_id: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: template,
        message: 'Template created'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/export-templates', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to create export template',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create template',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
