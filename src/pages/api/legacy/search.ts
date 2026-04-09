import type { APIRoute } from 'astro';
import { legacyRedirectResponse } from '../../../lib/api-legacy';

const SUNSET_DATE = 'Wed, 30 Sep 2026 23:59:59 GMT';

export const GET: APIRoute = async ({ request }) => {
  return legacyRedirectResponse(request.url, {
    replacementPath: '/api/search',
    sunsetDate: SUNSET_DATE,
    docUrl: '/docs/API_LEGACY_POLICY.md',
  });
};
