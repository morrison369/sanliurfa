/**
 * Schedule Report (Admin)
 */

import type { APIRoute } from 'astro';
import { validateWithSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { queryMany, insert, update, queryOne } from '../../../../lib/postgres';

const schema = {
  type: {
    type: 'string' as const,
    required: true,
    pattern: '^(users|places|reviews|revenue|engagement)$'
  },
  period: {
    type: 'string' as const,
    required: true,
    pattern: '^(daily|weekly|monthly)$'
  },
  frequency: {
    type: 'string' as const,
    required: true,
    pattern: '^(daily|weekly|monthly)$'
  },
  email: {
    type: 'string' as const,
    required: true,
    pattern: '^[^@]+@[^@]+\\.[^@]+$'
  }
};

// GET scheduled reports
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/reports/schedule', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const scheduled = await queryMany('SELECT * FROM scheduled_reports WHERE enabled = true ORDER BY created_at DESC');

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/reports/schedule', HttpStatus.OK, duration);

    return apiResponse(
      { success: true, data: { scheduled, count: scheduled.length } },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/reports/schedule', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get scheduled reports failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// POST create scheduled report
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/admin/reports/schedule', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/admin/reports/schedule', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid schedule parameters',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { type, period, frequency, email } = validation.data as any;

    // Insert scheduled report
    const query = `
      INSERT INTO scheduled_reports
      (report_type, period, frequency, email, enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING id, report_type, period, frequency, email, enabled
    `;

    const result = await queryOne(query, [type, period, frequency, email]);

    if (!result) {
      recordRequest('POST', '/api/admin/reports/schedule', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to schedule report',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/reports/schedule', HttpStatus.CREATED, duration);
    logger.info('Report scheduled', { type, frequency, email, duration });

    return apiResponse(
      { success: true, data: result },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/reports/schedule', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Schedule report failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// DELETE scheduled report
export const DELETE: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('DELETE', '/api/admin/reports/schedule', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const id = url.searchParams.get('id');

    if (!id) {
      recordRequest('DELETE', '/api/admin/reports/schedule', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.INVALID_INPUT, 'Schedule ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const result = await update('scheduled_reports', { id }, { enabled: false, updated_at: new Date().toISOString() });

    if (!result) {
      recordRequest('DELETE', '/api/admin/reports/schedule', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Schedule not found', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/admin/reports/schedule', HttpStatus.OK, duration);
    logger.info('Report schedule disabled', { id, duration });

    return apiResponse({ success: true, data: { disabled: true } }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/admin/reports/schedule', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Delete schedule failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
