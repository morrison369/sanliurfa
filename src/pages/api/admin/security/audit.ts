/**
 * Security Audit Report (Admin)
 */

import type { APIRoute } from 'astro';
import { runSecurityAudit, generateAuditReportHTML } from '../../../../lib/security-audit';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      recordRequest('GET', '/api/admin/security/audit', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const report = await runSecurityAudit();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/admin/security/audit', HttpStatus.OK, duration);
    logger.info('Security audit executed', { score: report.overallScore, duration });

    return apiResponse({ success: true, data: report }, HttpStatus.OK, requestId);
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
    if (!locals.isAdmin) {
      recordRequest('POST', '/api/admin/security/audit', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return new Response('Unauthorized', { status: 403 });
    }

    const report = await runSecurityAudit();
    const html = generateAuditReportHTML(report);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/security/audit', HttpStatus.OK, duration);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/admin/security/audit', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Security audit report generation failed', error instanceof Error ? error : new Error(String(error)));
    return new Response('Internal server error', { status: 500 });
  }
};
