import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Steady state
    { duration: '2m', target: 200 }, // Spike
    { duration: '5m', target: 200 }, // Sustained load
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 0.1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4321';

export default function () {
  // Test homepage
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage load time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test API endpoints
  const placesRes = http.get(`${BASE_URL}/api/places?limit=10`);
  check(placesRes, {
    'places API status is 200': (r) => r.status === 200,
    'places API returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });

  sleep(1);

  // Test blog API
  const blogRes = http.get(`${BASE_URL}/api/blog/posts?limit=5`);
  check(blogRes, {
    'blog API status is 200': (r) => r.status === 200,
  });

  sleep(2);
}
