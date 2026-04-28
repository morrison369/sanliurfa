/**
 * k6 Soak Test
 * Long-running test to detect memory leaks and performance degradation
 * 
 * Usage:
 *   k6 run --env BASE_URL=https://sanliurfa.com load-tests/soak-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');

// Soak test: Long duration at moderate load
export const options = {
  stages: [
    { duration: '5m', target: 20 },   // Warm up
    { duration: '4h', target: 20 },   // Soak for 4 hours
    { duration: '5m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // Consistent performance
    http_req_failed: ['rate<0.01'],    // Very low error rate
    'error_rate': ['rate<0.01'],
  },
};

export default function () {
  const start = Date.now();
  
  const res = http.get(`${BASE_URL}/api/health`);
  
  responseTime.add(Date.now() - start);
  
  const success = check(res, {
    'health check passes': (r) => r.status === 200,
  });
  
  errorRate.add(!success);
  sleep(1);
}
