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
import { validateWithSchema, type ValidationSchema } from '../../../../lib/validation';

type ReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

interface UpdateReportBody {
  status: ReportStatus;
  resolution_note?: string;
}

const REPORT_STATUSES = new Set<ReportStatus>(['open', 'investigating', 'resolved', 'dismissed']);

const updateReportSchema: ValidationSchema = {
  status: {
    type: 'string' as const,
    required: true,
    pattern: '^(open|investigating|resolved|dismissed)$'
  },
  resolution_note: {
    type: 'string' as const,
    required: false,
    maxLength: 500,
    sanitize: true
  }
};

function toPositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function getReportStatus(value: string | null): ReportStatus | 'all' {
  if (value === 'all') return 'all';
  return value && REPORT_STATUSES.has(value as ReportStatus) ? (value as ReportStatus) : 'open';
}

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || !locals.isAdmin) {
      recordRequest('GET', '/api/admin/moderation/reports', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Bu işlem için yönetici yetkisi gerekiyor',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const status = getReportStatus(url.searchParams.get('status'));
    const limit = toPositiveInt(url.searchParams.get('limit'), 50, 100);
    const offset = Math.max(Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const page = Math.floor(offset / limit) + 1;

    const reports = await getReports(status, page, limit);

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
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || !locals.isAdmin) {
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

    const body = (await request.json().catch(() => ({}))) as Partial<UpdateReportBody>;
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

    const data = validation.data as UpdateReportBody;
    const updatedReport = await updateReportStatus(
      reportId,
      data.status,
      user.id,
      data.resolution_note
    );

    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/admin/moderation/reports', HttpStatus.OK, duration);
    logger.logMutation('update', 'reports', reportId, user.id);

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
