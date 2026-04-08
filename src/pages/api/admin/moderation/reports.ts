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
    const user = locals.user;

    if (!user || !user.isAdmin) {
      recordRequest('GET', '/api/admin/moderation/reports', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu işlem için yönetici yetkisi gerekiyor',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const status = url.searchParams.get('status') as any;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const reports = await getReports(status, limit, offset);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/moderation/reports', HttpStatus.OK, duration);

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
    const user = locals.user;

    if (!user || !user.isAdmin) {
      recordRequest('PUT', '/api/admin/moderation/reports', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu işlem için yönetici yetkisi gerekiyor',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const reportId = url.searchParams.get('id');
    if (!reportId) {
      recordRequest('PUT', '/api/admin/moderation/reports', HttpStatus.BAD_REQUEST, Date.now() - startTime);
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
      recordRequest('PUT', '/api/admin/moderation/reports', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
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
      user.id,
      validation.data.resolution_note
    );

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/admin/moderation/reports', HttpStatus.OK, duration);
    logger.logMutation('update', 'reports', reportId, user.id, { status: validation.data.status });

    return apiResponse(
      {
        success: true,
        data: updatedReport
      },
      HttpStatus.OK,
      requestId
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
