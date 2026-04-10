/**
 * Security Audit Report (Admin)
 */

import type { APIRoute } from 'astro';
import { runSecurityAudit, generateAuditReportHTML } from '../../../../lib/security-audit';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';
import { withAdminOpsReadAccess, withAdminOpsWriteAccess } from '../../../../lib/admin-ops-access';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsReadAccess({
      request,
      locals,
      endpoint: '/api/admin/security/audit',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('GET', '/api/admin/security/audit', statusCode, duration);
      },
      onSuccess: (_response, duration) => {
        recordRequest('GET', '/api/admin/security/audit', HttpStatus.OK, duration);
      }
    }, async () => {
      const report = await runSecurityAudit();
      logger.info('Security audit executed', { score: report.overallScore, duration: Date.now() - startTime });
      return apiResponse({ success: true, data: report }, HttpStatus.OK, requestId);
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/security/audit', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Security audit failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// HTML report endpoint for viewing in browser
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess({
      request,
      locals,
      endpoint: '/api/admin/security/audit',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('POST', '/api/admin/security/audit', statusCode, duration);
      },
      onSuccess: (response, duration) => {
        recordRequest('POST', '/api/admin/security/audit', response.status, duration);
      }
    }, async () => {
      const report = await runSecurityAudit();
      const html = generateAuditReportHTML(report);

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Request-ID': requestId
        }
      });
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/security/audit', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Security audit report generation failed', error instanceof Error ? error : new Error(String(error)));
    return new Response('Internal server error', { status: 500 });
  }
};
