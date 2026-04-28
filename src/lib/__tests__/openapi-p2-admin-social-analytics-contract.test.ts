import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const routeMethods = [
  { route: '/admin/reports/schedule', methods: ['post'] },
  { route: '/admin/reports/social-lifecycle', methods: ['get'] },
  { route: '/admin/revenue', methods: ['get'] },
  { route: '/admin/reviews/antispam-events', methods: ['get'] },
  { route: '/admin/security/audit', methods: ['get'] },
  { route: '/admin/security/guidelines', methods: ['get'] },
  { route: '/admin/social/events', methods: ['get'] },
  { route: '/admin/social/events/export', methods: ['get'] },
  { route: '/admin/social/events/stream', methods: ['get'] },
  { route: '/admin/social/policies', methods: ['get'] },
  { route: '/admin/social/policies/simulate', methods: ['get'] },
  { route: '/admin/social/risk', methods: ['get'] },
  { route: '/admin/social/risk/webhook-log', methods: ['get'] },
  { route: '/admin/social/risk/webhook-metrics', methods: ['get'] },
  { route: '/admin/social/risk/webhook-test', methods: ['post'] },
  { route: '/admin/subscriptions/analytics', methods: ['get'] },
  { route: '/admin/subscriptions/users', methods: ['get'] },
  { route: '/admin/users', methods: ['get'] },
  { route: '/admin/users/{id}', methods: ['get'] },
  { route: '/admin/vendor/{id}/approve', methods: ['post'] },
  { route: '/admin/vendor/{id}/reject', methods: ['post'] },
  { route: '/admin/vendor/pending', methods: ['get'] },
  { route: '/admin/verifications', methods: ['get'] },
  { route: '/admin/verifications/{id}/approve', methods: ['post'] },
  { route: '/admin/verifications/{id}/reject', methods: ['post'] },
  { route: '/ai/recommendations', methods: ['get'] },
  { route: '/ai/similar', methods: ['get'] },
  { route: '/analytics', methods: ['get'] },
  { route: '/analytics/cohorts', methods: ['get'] },
  { route: '/analytics/dashboard', methods: ['get'] },
] as const;

describe('openapi P2 admin social and analytics contract', () => {
  it('keeps the third P2 admin/social/analytics route batch documented', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    for (const { route, methods } of routeMethods) {
      for (const method of methods) {
        const operation = spec?.paths?.[route]?.[method];
        expect(operation, `${route} ${method.toUpperCase()}`).toBeDefined();

        const responses = operation?.responses ?? {};
        const successCodes = Object.keys(responses).filter((code) => code.startsWith('2'));
        expect(successCodes.length, `${route} ${method.toUpperCase()} 2xx`).toBeGreaterThan(0);
        expect(Object.keys(responses).length, `${route} ${method.toUpperCase()} responses`).toBeGreaterThan(
          0,
        );
      }
    }
  });
});
