import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Steady state
    { duration: '2m', target: 200 }, // Ramp up
    { duration: '5m', target: 200 }, // Steady state
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test homepage
  const homeRes = http.get(`${BASE_URL}/`);
  const homeSuccess = check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads under 1s': (r) => r.timings.duration < 1000,
  });
  errorRate.add(!homeSuccess);
  responseTime.add(homeRes.timings.duration);

  sleep(1);

  // Test places API
  const placesRes = http.get(`${BASE_URL}/api/v1/places?page=1&limit=20`);
  const placesSuccess = check(placesRes, {
    'places API status is 200': (r) => r.status === 200,
    'places API returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  errorRate.add(!placesSuccess);
  responseTime.add(placesRes.timings.duration);

  sleep(1);

  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  const healthSuccess = check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check returns healthy': (r) => JSON.parse(r.body).status === 'healthy',
  });
  errorRate.add(!healthSuccess);
  responseTime.add(healthRes.timings.duration);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors !== false;
  
  let summary = '';
  summary += `${indent}Load Test Results\n`;
  summary += `${indent}=================\n\n`;
  summary += `${indent}Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Failed: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}Avg Duration: ${data.metrics.http_req_duration.values.avg}ms\n`;
  summary += `${indent}P95 Duration: ${data.metrics.http_req_duration.values['p(95)']}ms\n`;
  
  return summary;
}
