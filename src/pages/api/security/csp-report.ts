/**
 * CSP Violation Report Endpoint
 *
 * Browser otomatik POST eder: response header `Content-Security-Policy: ... report-uri /api/security/csp-report`
 * Body: `application/csp-report` veya `application/json` — {"csp-report": {...}}
 *
 * - Anonymous (auth yok — middleware PUBLIC_PATHS'e eklenmeli)
 * - IP rate limit (60/dakika) — kötü niyetli flood'a karşı
 * - DB insert fail-safe (production noise'ı request response'a yansımasın)
 * - Sadece kendi document-uri'lerimizi kabul ederiz (cross-site noise filter)
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { applyRateLimit } from '../../../lib/security/rate-limit';
import { getPublicAppUrl } from '../../../lib/public-app-url';

interface CSPReport {
  'document-uri'?: string;
  referrer?: string;
  'blocked-uri'?: string;
  'violated-directive'?: string;
  'effective-directive'?: string;
  'original-policy'?: string;
  disposition?: string;
  'status-code'?: number;
  'source-file'?: string;
  'line-number'?: number;
  'column-number'?: number;
  'script-sample'?: string;
}

function isOwnDocument(documentUri: string, baseUrl: string): boolean {
  try {
    const docHost = new URL(documentUri).host;
    const baseHost = new URL(baseUrl).host;
    return docHost === baseHost;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async (ctx) => {
  // 204 her zaman dönülür — browser bekler. Ancak ratelimit/parse hatasında body'i sessizce yutar.
  const limited = await applyRateLimit(ctx, {
    windowMs: 60_000,
    maxRequests: 60,
    keyPrefix: 'csp-report',
  });
  if (limited) return limited;

  try {
    const raw = await ctx.request.text();
    if (!raw) return new Response(null, { status: 204 });

    let parsed: { 'csp-report'?: CSPReport } | CSPReport;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return new Response(null, { status: 204 });
    }

    const report: CSPReport = (parsed as any)['csp-report'] ?? (parsed as CSPReport);
    const violatedDirective = report['violated-directive'];
    const documentUri = report['document-uri'] || '';

    if (!violatedDirective) return new Response(null, { status: 204 });

    // Cross-site noise filter — sadece kendi domain'imizi kabul et
    const baseUrl = getPublicAppUrl();
    if (documentUri && !isOwnDocument(documentUri, baseUrl)) {
      return new Response(null, { status: 204 });
    }

    const userAgent = ctx.request.headers.get('user-agent') || null;

    // Fail-safe DB insert — log'a düş, response'a yansıma
    await query(
      `INSERT INTO csp_violations (
        document_uri, referrer, blocked_uri, violated_directive, effective_directive,
        original_policy, disposition, status_code, source_file, line_number,
        column_number, script_sample, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        documentUri.substring(0, 2048),
        (report.referrer || '').substring(0, 2048),
        (report['blocked-uri'] || '').substring(0, 2048),
        violatedDirective.substring(0, 256),
        (report['effective-directive'] || '').substring(0, 256),
        (report['original-policy'] || '').substring(0, 4096),
        (report.disposition || '').substring(0, 32),
        report['status-code'] ?? null,
        (report['source-file'] || '').substring(0, 2048) || null,
        report['line-number'] ?? null,
        report['column-number'] ?? null,
        (report['script-sample'] || '').substring(0, 1024) || null,
        userAgent ? userAgent.substring(0, 512) : null,
      ]
    ).catch((err) => {
      logger.warn('CSP violation DB insert failed', { error: err instanceof Error ? err.message : String(err) });
    });

    logger.info('CSP violation reported', {
      directive: violatedDirective,
      blocked: report['blocked-uri'],
      document: documentUri,
    });
  } catch (err) {
    // Production noise — sessizce yut
    logger.warn('CSP report processing failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return new Response(null, { status: 204 });
};
