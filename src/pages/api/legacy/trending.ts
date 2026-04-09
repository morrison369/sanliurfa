import type { APIRoute } from 'astro';
import { legacyRedirectResponse } from '../../../lib/api-legacy';
import { recordRequest } from '../../../lib/metrics';

const SUNSET_DATE = 'Wed, 30 Sep 2026 23:59:59 GMT';

export const GET: APIRoute = async ({ request }) => {
  recordRequest('GET', '/api/legacy/trending', 301, 0);
  return legacyRedirectResponse(request.url, {
    replacementPath: '/api/trending',
    sunsetDate: SUNSET_DATE,
    docUrl: '/docs/API_LEGACY_POLICY.md',
  });
};
