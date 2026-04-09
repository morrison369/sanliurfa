import { describe, expect, it } from 'vitest';
import { buildLegacyHeaders, legacyRedirectResponse } from '../api-legacy';

describe('api-legacy', () => {
  it('builds deprecation and sunset headers', () => {
    const headers = buildLegacyHeaders({
      replacementPath: '/api/search',
      sunsetDate: 'Wed, 30 Sep 2026 23:59:59 GMT',
      docUrl: '/docs/API_LEGACY_POLICY.md',
    });

    expect(headers.get('Deprecation')).toBe('true');
    expect(headers.get('Sunset')).toContain('2026');
    expect(headers.get('X-Legacy-Endpoint')).toBe('true');
  });

  it('returns redirect response while preserving query string', async () => {
    const response = legacyRedirectResponse('https://sanliurfa.com/api/legacy/search?q=gobeklitepe', {
      replacementPath: '/api/search',
      sunsetDate: 'Wed, 30 Sep 2026 23:59:59 GMT',
    });

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toContain('/api/search?q=gobeklitepe');
    const payload = await response.json();
    expect(payload.legacy).toBe(true);
  });
});
