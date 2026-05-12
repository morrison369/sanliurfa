/**
 * k6 PRODUCTION Baseline Load Test
 *
 * 50 concurrent users, 5 minutes, ramped — establishes prod capacity baseline.
 * Hits read-only public endpoints with realistic browse patterns.
 *
 * Usage:
 *   k6 run --env BASE_URL=https://sanliurfa.com load-tests/prod-baseline.js
 *
 * SAFETY:
 *   - Read-only endpoints (no DB writes)
 *   - Respects 5-min duration cap (no soak)
 *   - Auto-stop if error rate > 5% (abort_on_fail threshold)
 *   - Use during low-traffic window (e.g., 03:00 TR time)
 *
 * Use sparingly — runs against live production.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://sanliurfa.com';
const errorRate = new Rate('errors');
const homepageDuration = new Trend('homepage_duration_ms');
const apiDuration = new Trend('api_duration_ms');
const requestCounter = new Counter('total_requests');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warmup ramp
    { duration: '1m',  target: 50 },   // Ramp to 50 VUs
    { duration: '3m',  target: 50 },   // Steady state — 3 min sustained
    { duration: '30s', target: 0 },    // Cooldown
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true }], // Auto-abort if >5% errors
    errors: ['rate<0.05'],
    homepage_duration_ms: ['p(95)<2000'],
    api_duration_ms: ['p(95)<800'],
  },
  noConnectionReuse: false,           // Reuse keepalive (realistic browser)
  userAgent: 'k6-prod-baseline/1.0 (sanliurfa.com)',
  summaryTrendStats: ['min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const browseScenarios = [
  // Anonymous visitor browsing places
  () => {
    group('Browse: Homepage → Place List → Place Detail', () => {
      const home = http.get(`${BASE_URL}/`);
      check(home, { 'homepage 200': (r) => r.status === 200 });
      homepageDuration.add(home.timings.duration);
      requestCounter.add(1);
      sleep(2);

      const places = http.get(`${BASE_URL}/api/places?limit=20`);
      check(places, { 'places API 200': (r) => r.status === 200 });
      apiDuration.add(places.timings.duration);
      requestCounter.add(1);
      sleep(1.5);

      // Click a sample place (use first in list if available)
      try {
        const firstSlug = places.json('data')?.[0]?.slug || 'goebeklitepe';
        const detail = http.get(`${BASE_URL}/mekan/${firstSlug}`);
        check(detail, { 'place detail 200/404': (r) => [200, 404].includes(r.status) });
        requestCounter.add(1);
      } catch { /* ignore parse errors */ }
      sleep(2);
    });
  },

  // Search visitor
  () => {
    group('Search: query', () => {
      const search = http.get(`${BASE_URL}/api/search?q=tarihi&type=places&limit=10`);
      const ok = check(search, { 'search 200': (r) => r.status === 200 });
      apiDuration.add(search.timings.duration);
      requestCounter.add(1);
      errorRate.add(!ok);
      sleep(1.5);
    });
  },

  // Blog reader
  () => {
    group('Blog: list → post', () => {
      const blogList = http.get(`${BASE_URL}/api/blog/posts?limit=10`);
      check(blogList, { 'blog list 200': (r) => r.status === 200 });
      apiDuration.add(blogList.timings.duration);
      requestCounter.add(1);
      sleep(2);

      const blogPage = http.get(`${BASE_URL}/blog`);
      check(blogPage, { 'blog page 200': (r) => r.status === 200 });
      requestCounter.add(1);
      sleep(2);
    });
  },

  // Sitemap / SEO crawler simulation
  () => {
    group('Crawler: sitemap', () => {
      const sitemap = http.get(`${BASE_URL}/sitemap.xml`);
      check(sitemap, { 'sitemap 200': (r) => r.status === 200 });
      requestCounter.add(1);
      sleep(0.5);
    });
  },
];

export default function () {
  // Pick a random scenario for realistic mix
  const scenario = browseScenarios[Math.floor(Math.random() * browseScenarios.length)];
  scenario();
}

export function handleSummary(data) {
  const failed = data.metrics.errors?.values?.rate || 0;
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const total = data.metrics.total_requests?.values?.count || 0;
  const summary = {
    base_url: BASE_URL,
    total_requests: total,
    duration_seconds: Math.round((data.state?.testRunDurationMs || 0) / 1000),
    failed_rate_pct: +(failed * 100).toFixed(2),
    p95_ms: Math.round(p95),
    p99_ms: Math.round(p99),
    homepage_p95_ms: Math.round(data.metrics.homepage_duration_ms?.values?.['p(95)'] || 0),
    api_p95_ms: Math.round(data.metrics.api_duration_ms?.values?.['p(95)'] || 0),
    verdict: failed < 0.05 && p95 < 1500 ? 'PASS' : 'FAIL',
  };
  return {
    stdout: `\n${'='.repeat(60)}\nPROD BASELINE — ${summary.verdict}\n${'='.repeat(60)}\n` +
            JSON.stringify(summary, null, 2) + '\n' + '='.repeat(60) + '\n',
    'load-tests/results/prod-baseline.json': JSON.stringify(summary, null, 2),
  };
}
