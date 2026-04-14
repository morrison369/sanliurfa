/**
 * k6 Smoke Test
 * Quick verification that the system works
 * 
 * Usage:
 *   k6 run --env BASE_URL=https://sanliurfa.com load-tests/smoke-test.js
 */

import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,              // 1 virtual user
  iterations: 1,       // Run once
  thresholds: {
    http_req_duration: ['max<2000'], // Max 2s
    http_req_failed: ['rate==0'],    // No errors allowed
  },
};

export default function () {
  group('Smoke Test - Critical Endpoints', () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      'health is 200': (r) => r.status === 200,
      'health returns valid JSON': (r) => r.json('status') === 'healthy',
    });

    // Home page
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
      'home is 200': (r) => r.status === 200,
      'home contains expected content': (r) => r.body.includes('Şanlıurfa'),
    });

    // API docs
    const docsRes = http.get(`${BASE_URL}/api/docs`);
    check(docsRes, {
      'docs is 200': (r) => r.status === 200,
    });
  });
}
