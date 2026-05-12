/**
 * k6 PRODUCTION Smoke Test
 *
 * Read-only, low-traffic verification that prod is alive + responsive.
 * Hits public read-only endpoints — no auth, no writes, no PII.
 *
 * Usage:
 *   k6 run --env BASE_URL=https://sanliurfa.com load-tests/prod-smoke.js
 *
 * SAFE FOR PROD: 1 VU, ~10 requests, no DB writes, respects robots.txt'd endpoints.
 *
 * Exit codes:
 *   0 = all checks passed
 *   non-zero = threshold breach (CI fail)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://sanliurfa.com';
const errorRate = new Rate('errors');
const ttfb = new Trend('ttfb_ms');

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // p95 under 2s — generous prod tolerance
    http_req_failed: ['rate==0'],         // ANY error = fail (smoke = strict)
    errors: ['rate==0'],
    ttfb_ms: ['p(95)<1500'],              // First-byte under 1.5s
  },
  // CI-friendly summary
  summaryTrendStats: ['min', 'med', 'p(95)', 'max'],
};

const readOnlyEndpoints = [
  { path: '/api/health', expectStatus: 200, expectJsonField: 'status' },
  { path: '/', expectStatus: 200, expectBodyContains: 'Şanlıurfa' },
  { path: '/sitemap.xml', expectStatus: 200, expectContentType: 'xml' },
  { path: '/robots.txt', expectStatus: 200, expectContentType: 'text' },
  { path: '/llms.txt', expectStatus: 200, expectContentType: 'text' },
  { path: '/api/places?limit=5', expectStatus: 200, expectJsonField: 'data' },
  { path: '/blog', expectStatus: 200 },
  { path: '/etkinlikler', expectStatus: 200 },
  { path: '/hakkinda', expectStatus: 200 },
  { path: '/iletisim', expectStatus: 200 },
];

export default function () {
  for (const ep of readOnlyEndpoints) {
    group(`GET ${ep.path}`, () => {
      const res = http.get(`${BASE_URL}${ep.path}`, {
        headers: { 'User-Agent': 'k6-prod-smoke/1.0 (sanliurfa.com)' },
        tags: { endpoint: ep.path },
      });

      const checks = {
        [`${ep.path} status ${ep.expectStatus}`]: (r) => r.status === ep.expectStatus,
        [`${ep.path} TTFB < 2s`]: (r) => r.timings.waiting < 2000,
      };

      if (ep.expectBodyContains) {
        checks[`${ep.path} body contains expected`] = (r) =>
          r.body && r.body.includes(ep.expectBodyContains);
      }
      if (ep.expectJsonField) {
        checks[`${ep.path} JSON has field`] = (r) => {
          try { return r.json(ep.expectJsonField) !== undefined; } catch { return false; }
        };
      }
      if (ep.expectContentType) {
        checks[`${ep.path} Content-Type ${ep.expectContentType}`] = (r) => {
          const ct = (r.headers['Content-Type'] || '').toLowerCase();
          return ct.includes(ep.expectContentType);
        };
      }

      const ok = check(res, checks);
      errorRate.add(!ok);
      ttfb.add(res.timings.waiting);
      sleep(0.2); // Small gap between requests — kind to prod
    });
  }
}

export function handleSummary(data) {
  const failed = data.metrics.errors?.values?.rate || 0;
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const summary = {
    base_url: BASE_URL,
    total_requests: data.metrics.http_reqs?.values?.count || 0,
    failed_rate: failed,
    p95_duration_ms: Math.round(p95),
    ttfb_p95_ms: Math.round(data.metrics.ttfb_ms?.values?.['p(95)'] || 0),
    verdict: failed === 0 && p95 < 2000 ? 'PASS' : 'FAIL',
  };
  return {
    stdout: `\n${'='.repeat(60)}\nPROD SMOKE — ${summary.verdict}\n${'='.repeat(60)}\n` +
            `Target:        ${summary.base_url}\n` +
            `Requests:      ${summary.total_requests}\n` +
            `Failed rate:   ${(summary.failed_rate * 100).toFixed(2)}%\n` +
            `p95 duration:  ${summary.p95_duration_ms}ms\n` +
            `p95 TTFB:      ${summary.ttfb_p95_ms}ms\n` +
            `${'='.repeat(60)}\n`,
    'load-tests/results/prod-smoke.json': JSON.stringify(summary, null, 2),
  };
}
