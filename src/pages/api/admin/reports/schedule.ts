/**
 * Schedule Report (Admin)
 */

import type { APIRoute } from 'astro';
import { validateWithSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { queryRows, insert, update, queryOne } from '../../../../lib/postgres';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

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
    return await withAdminOpsReadAccess({
      request,
      locals,
      endpoint: '/api/admin/reports/schedule',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('GET', '/api/admin/reports/schedule', statusCode, duration);
      },
      onSuccess: (_response, duration) => {
        recordRequest('GET', '/api/admin/reports/schedule', HttpStatus.OK, duration);
      }
    }, async () => {
      const scheduled = await queryRows(
        `SELECT id, name, report_type, frequency, next_run_at, last_run_at,
                email_recipients, enabled, created_at, updated_at
         FROM scheduled_reports WHERE enabled = true ORDER BY created_at DESC`
      );

      return apiResponse(
        { success: true, data: { scheduled, count: scheduled.length } },
        HttpStatus.OK,
        requestId
      );
    });
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
    return await withAdminOpsWriteAccess({
      request,
      locals,
      endpoint: '/api/admin/reports/schedule',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('POST', '/api/admin/reports/schedule', statusCode, duration);
      },
      onSuccess: (response, duration) => {
        recordRequest('POST', '/api/admin/reports/schedule', response.status, duration);
      }
    }, async () => {
      const body = await request.json();
      const validation = validateWithSchema(body, schema as any);

      if (!validation.valid) {
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid schedule parameters',
          HttpStatus.UNPROCESSABLE_ENTITY,
          validation.errors,
          requestId
        );
      }

      const { type, period, frequency, email } = validation.data as any;
      const query = `
        INSERT INTO scheduled_reports
        (report_type, period, frequency, email, enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        RETURNING id, report_type, period, frequency, email, enabled
      `;

      const result = await queryOne(query, [type, period, frequency, email]);

      if (!result) {
        return apiError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to schedule report',
          HttpStatus.INTERNAL_SERVER_ERROR,
          undefined,
          requestId
        );
      }

      logger.info('Report scheduled', { type, frequency, email, duration: Date.now() - startTime });

      return apiResponse(
        { success: true, data: result },
        HttpStatus.CREATED,
        requestId
      );
    });
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
    return await withAdminOpsWriteAccess({
      request,
      locals,
      endpoint: '/api/admin/reports/schedule',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('DELETE', '/api/admin/reports/schedule', statusCode, duration);
      },
      onSuccess: (response, duration) => {
        recordRequest('DELETE', '/api/admin/reports/schedule', response.status, duration);
      }
    }, async () => {
      const id = url.searchParams.get('id');

      if (!id) {
        return apiError(ErrorCode.INVALID_INPUT, 'Schedule ID required', HttpStatus.BAD_REQUEST, undefined, requestId);
      }

      const result = await update('scheduled_reports', { id }, { enabled: false, updated_at: new Date().toISOString() });

      if (!result) {
        return apiError(ErrorCode.NOT_FOUND, 'Schedule not found', HttpStatus.NOT_FOUND, undefined, requestId);
      }

      logger.info('Report schedule disabled', { id, duration: Date.now() - startTime });

      return apiResponse({ success: true, data: { disabled: true } }, HttpStatus.OK, requestId);
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/admin/reports/schedule', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Delete schedule failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
