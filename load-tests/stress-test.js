import http from 'k6/http';
import { check, sleep } from 'k6';

// Stress test - find breaking point
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 700 },
    { duration: '5m', target: 700 },
    { duration: '10m', target: 0 }, // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4321';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/`],
    ['GET', `${BASE_URL}/mekanlar`],
    ['GET', `${BASE_URL}/blog`],
    ['GET', `${BASE_URL}/api/places?limit=20`],
  ]);

  check(responses, {
    'all status 200': (r) => r.every(res => res.status === 200),
  });

  sleep(Math.random() * 3 + 1);
}
