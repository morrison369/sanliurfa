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
  reportToJSON
} from '../../../../lib/reporting';
import { validateWithSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

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
  format: {
    type: 'string' as const,
    required: false,
    pattern: '^(json|csv)$'
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess({
      request,
      locals,
      endpoint: '/api/admin/reports/generate',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('POST', '/api/admin/reports/generate', statusCode, duration);
      },
      onSuccess: (response, duration) => {
        recordRequest('POST', '/api/admin/reports/generate', response.status, duration);
      }
    }, async () => {
      const body = await request.json();
      const validation = validateWithSchema(body, schema as any);

      if (!validation.valid) {
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid report parameters',
          HttpStatus.UNPROCESSABLE_ENTITY,
          validation.errors,
          requestId
        );
      }

      const { type, period, format = 'json' } = validation.data as { type: string; period: 'daily' | 'weekly' | 'monthly'; format?: string };

      let report;
      switch (type) {
        case 'users':
          report = await generateUserReport(period);
          break;
        case 'places':
          report = await generatePlacesReport(period);
          break;
        case 'reviews':
          report = await generateReviewsReport(period);
          break;
        case 'revenue':
          report = await generateRevenueReport(period);
          break;
        case 'engagement':
          report = await generateEngagementReport(period);
          break;
        default:
          report = null;
      }

      if (!report) {
        return apiError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to generate report',
          HttpStatus.INTERNAL_SERVER_ERROR,
          undefined,
          requestId
        );
      }

      const summary = getSummaryStats(report);
      const content = format === 'csv' ? reportToCSV(report) : reportToJSON(report);

      logger.info('Report generated', { type, period, format, duration: Date.now() - startTime });

      if (format === 'csv') {
        return new Response(content, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${type}_${period}_${Date.now()}.csv"`,
            'X-Request-ID': requestId
          }
        });
      }

      return apiResponse(
        {
          success: true,
          data: {
            report,
            summary,
            downloadURL: `/api/admin/reports/export?type=${type}&period=${period}&format=csv`
          }
        },
        HttpStatus.OK,
        requestId
      );
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/reports/generate', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Report generation failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
