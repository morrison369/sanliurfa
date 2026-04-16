/**
 * Admin Moderation Reports API
 * GET: Get reports for review
 * PUT: Update report status and resolution
 */

import type { APIRoute } from 'astro';
import { getReports, updateReportStatus } from '../../../../lib/moderation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { validateWithSchema } from '../../../../lib/validation';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

const updateReportSchema = {
  status: {
    type: 'string' as const,
    required: true,
    pattern: '^(pending|under_review|resolved|dismissed)$'
  },
  resolution_note: {
    type: 'string' as const,
    required: false,
    maxLength: 500,
    sanitize: true
  }
};

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/moderation/reports',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('GET', '/api/admin/moderation/reports', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('GET', '/api/admin/moderation/reports', response.status, duration);
        },
      },
      async () => {
        const status = url.searchParams.get('status') as any;
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        const reports = await getReports(status, limit, offset);

        return apiResponse(
          {
            success: true,
            data: reports,
            count: reports.length,
            limit,
            offset
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/reports', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get reports failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Raporlar alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess(
      {
        request,
        locals,
        endpoint: '/api/admin/moderation/reports',
        requestId,
        startTime,
        onDenied: (_response, statusCode, duration) => {
          recordRequest('PUT', '/api/admin/moderation/reports', statusCode, duration);
        },
        onSuccess: (response, duration) => {
          recordRequest('PUT', '/api/admin/moderation/reports', response.status, duration);
        },
      },
      async () => {
        const reportId = url.searchParams.get('id');
        if (!reportId) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'Rapor ID gereklidir',
            HttpStatus.BAD_REQUEST,
            undefined,
            requestId
          );
        }

        const body = await request.json();
        const validation = validateWithSchema(body, updateReportSchema);

        if (!validation.valid) {
          return apiError(
            ErrorCode.VALIDATION_ERROR,
            'Geçersiz giriş',
            HttpStatus.UNPROCESSABLE_ENTITY,
            validation.errors,
            requestId
          );
        }

        const updatedReport = await updateReportStatus(
          reportId,
          validation.data.status,
          locals.user?.id,
          validation.data.resolution_note
        );

        logger.logMutation('update', 'reports', reportId, locals.user?.id, { status: validation.data.status });

        return apiResponse(
          {
            success: true,
            data: updatedReport
          },
          HttpStatus.OK,
          requestId
        );
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/admin/moderation/reports', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update report failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Rapor güncellenirken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
