/**
 * SEO Metrics API — Core Web Vitals collected from client browsers
 * POST: record a vitals measurement
 * GET:  aggregate report (admin only)
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

function rateVital(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  if (name === 'LCP') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
  if (name === 'FID') return value <= 100  ? 'good' : value <= 300  ? 'needs-improvement' : 'poor';
  if (name === 'CLS') return value <= 0.1  ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
  return 'needs-improvement';
}

// Map vital name to client_performance_metrics column
const COLUMN: Record<string, string> = {
  LCP: 'lcp', FCP: 'fcp', TTFB: 'ttfb', DCL: 'dcl', Load: 'load',
};

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();
    const { url: pageUrl, vitals } = body;

    if (!pageUrl || !vitals || !Array.isArray(vitals)) {
      recordRequest('POST', '/api/seo/metrics', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(ErrorCode.VALIDATION_ERROR, 'url ve vitals array gereklidir', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const ua = request.headers.get('user-agent') || '';

    // Build SET clause for any recognized vitals columns
    const columns: Record<string, number> = {};
    const metricsObj: Record<string, any> = {};

    for (const vital of vitals) {
      const col = COLUMN[vital.name];
      if (col) columns[col] = vital.value;
      metricsObj[vital.name] = { value: vital.value, rating: rateVital(vital.name, vital.value) };
    }

    const colNames = Object.keys(columns);
    const colValues = Object.values(columns);

    await query(
      `INSERT INTO client_performance_metrics
         (url, user_agent, metrics ${colNames.length ? ', ' + colNames.join(', ') : ''})
       VALUES ($1, $2, $3 ${colNames.map((_, i) => ', $' + (4 + i)).join('')})`,
      [pageUrl, ua, JSON.stringify(metricsObj), ...colValues]
    );

    recordRequest('POST', '/api/seo/metrics', HttpStatus.CREATED, Date.now() - startTime);
    logger.info('SEO metric recorded', { url: pageUrl });

    return apiResponse({ success: true }, HttpStatus.CREATED, requestId);
  } catch (error) {
    recordRequest('POST', '/api/seo/metrics', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    logger.error('SEO metric record failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Metric kaydedilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id || locals.user?.role !== 'admin') {
      recordRequest('GET', '/api/seo/metrics', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const url     = new URL(request.url);
    const from    = url.searchParams.get('from');
    const to      = url.searchParams.get('to');
    const metric  = url.searchParams.get('metric');
    const limit   = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);

    const params: any[] = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (from) { where += ` AND timestamp >= $${idx++}`; params.push(new Date(from)); }
    if (to)   { where += ` AND timestamp <= $${idx++}`; params.push(new Date(to)); }

    const [aggResult, recentResult] = await Promise.all([
      query(
        `SELECT
           AVG(lcp)   AS lcp_avg,   PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp)   AS lcp_p75,
           AVG(fcp)   AS fcp_avg,   PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fcp)   AS fcp_p75,
           AVG(ttfb)  AS ttfb_avg,  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ttfb)  AS ttfb_p75,
           COUNT(*)   AS total_samples
         FROM client_performance_metrics ${where}`,
        params
      ),
      query(
        `SELECT url, metrics, timestamp
         FROM client_performance_metrics
         ${where}
         ORDER BY timestamp DESC
         LIMIT $${idx}`,
        [...params, limit]
      ),
    ]);

    const r = aggResult.rows[0] || {};

    const allMetrics = [
      { name: 'LCP',  avg: Math.round(r.lcp_avg  || 0), p75: Math.round(r.lcp_p75  || 0) },
      { name: 'FCP',  avg: Math.round(r.fcp_avg  || 0), p75: Math.round(r.fcp_p75  || 0) },
      { name: 'TTFB', avg: Math.round(r.ttfb_avg || 0), p75: Math.round(r.ttfb_p75 || 0) },
    ];

    recordRequest('GET', '/api/seo/metrics', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      data: {
        metrics:    metric ? allMetrics.filter(m => m.name === metric) : allMetrics,
        recent:     recentResult.rows,
        totalSamples: parseInt(r.total_samples || '0'),
        from,
        to,
      },
      count: recentResult.rows.length,
    }, HttpStatus.OK, requestId);
  } catch (error) {
    recordRequest('GET', '/api/seo/metrics', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    logger.error('SEO metrics GET failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Metrics alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
