/**
 * Generate Report (Admin)
 */

import type { APIRoute } from 'astro';
import {
  generateUserReport,
  generatePlacesReport,
  generateReviewsReport,
  generateRevenueReport,
  generateEngagementReport,
  getSummaryStats,
  reportToCSV,
  reportToJSON,
} from '../../../../lib/analytics';
import { validateWithSchema, type ValidationSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

type ReportType = 'users' | 'places' | 'reviews' | 'revenue' | 'engagement';
type ReportPeriod = 'daily' | 'weekly' | 'monthly';
type ReportFormat = 'json' | 'csv';
type ReportPayload = { type: ReportType; period: ReportPeriod; format?: ReportFormat };
type ReportData = Awaited<ReturnType<typeof generateUserReport>>
  | Awaited<ReturnType<typeof generatePlacesReport>>
  | Awaited<ReturnType<typeof generateReviewsReport>>
  | Awaited<ReturnType<typeof generateRevenueReport>>
  | Awaited<ReturnType<typeof generateEngagementReport>>;

const schema: ValidationSchema = {
  type: {
    type: 'string',
    required: true,
    pattern: '^(users|places|reviews|revenue|engagement)$',
  },
  period: {
    type: 'string',
    required: true,
    pattern: '^(daily|weekly|monthly)$',
  },
  format: {
    type: 'string',
    required: false,
    pattern: '^(json|csv)$',
  },
};

function getReportRange(period: ReportPeriod): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);

  if (period === 'daily') start.setDate(end.getDate() - 1);
  if (period === 'weekly') start.setDate(end.getDate() - 7);
  if (period === 'monthly') start.setMonth(end.getMonth() - 1);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function normalizeReportForCsv(report: ReportData): Record<string, unknown>[] {
  return Object.entries(report).map(([key, value]) => ({
    metric: key,
    value: typeof value === 'object' && value !== null ? JSON.stringify(value) : value,
  }));
}

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (locals.user?.role !== 'admin') {
      recordRequest('POST', '/api/admin/reports/generate', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema);

    if (!validation.valid) {
      recordRequest('POST', '/api/admin/reports/generate', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Rapor parametreleri geçersiz',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { type, period, format = 'json' } = validation.data as ReportPayload;
    const { startDate, endDate } = getReportRange(period);

    let report: ReportData;

    switch (type) {
      case 'users':
        report = await generateUserReport(startDate, endDate);
        break;
      case 'places':
        report = await generatePlacesReport(startDate, endDate);
        break;
      case 'reviews':
        report = await generateReviewsReport(startDate, endDate);
        break;
      case 'revenue':
        report = await generateRevenueReport(startDate, endDate);
        break;
      case 'engagement':
        report = await generateEngagementReport(startDate, endDate);
        break;
    }

    const summary = await getSummaryStats();

    let content: string;

    if (format === 'csv') {
      content = reportToCSV(normalizeReportForCsv(report));
    } else {
      content = reportToJSON(report);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/reports/generate', HttpStatus.OK, duration);
    logger.info('Rapor oluşturuldu', { type, period, format, duration });

    if (format === 'csv') {
      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${type.replace(/[\r\n\0"\\]/g, '')}_${period.replace(/[\r\n\0"\\]/g, '')}_${Date.now()}.csv"`,
          'X-Request-ID': requestId,
        },
      });
    }

    return apiResponse(
      {
        success: true,
        data: {
          report,
          summary,
          downloadURL: `/api/admin/reports/export?type=${type}&period=${period}&format=csv`,
        },
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/reports/generate', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Rapor oluşturma başarısız', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

