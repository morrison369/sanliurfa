/**
 * Reports API
 * Create and manage scheduled reports
 */

import type { APIRoute } from 'astro';
import { createReport, getReports } from '../../../lib/business-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';
import { validateWithSchema } from '../../../lib/validation';

const reportSchema = {
  name: { type: 'string' as const, required: true, minLength: 1, maxLength: 255 },
  description: { type: 'string' as const, maxLength: 500 },
  report_type: { type: 'string' as const, maxLength: 50 },
  schedule: { type: 'string' as const, maxLength: 50 },
  format: { type: 'string' as const, pattern: '^(pdf|csv|json|excel)$' }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/reports', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const url = new URL(request.url);
    const isActive = url.searchParams.get('active') !== 'false';

    const reports = await getReports(locals.user.id, isActive);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reports', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: reports,
        count: reports.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/reports', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get reports',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get reports',
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
      recordRequest('POST', '/api/reports', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const validation = validateWithSchema(body, reportSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/reports', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid report data',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const report = await createReport(
      validation.data.name,
      locals.user.id,
      {
        description: validation.data.description,
        report_type: validation.data.report_type,
        schedule: validation.data.schedule,
        format: validation.data.format || 'pdf',
        metric_ids: body.metric_ids,
        filters: body.filters,
        recipients: body.recipients
      }
    );

    if (!report) {
      recordRequest('POST', '/api/reports', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create report',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reports', HttpStatus.CREATED, duration);
    logger.info('Report created', { report_id: report.id, user_id: locals.user.id });

    return apiResponse(
      {
        success: true,
        data: report,
        message: 'Report created'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reports', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to create report',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create report',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
