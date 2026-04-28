/**
 * Shared legacy API deprecation headers.
 */

export const LEGACY_SUNSET = 'Tue, 30 Sep 2026 23:59:59 GMT';

export function applyLegacyHeaders(response: Response): Response {
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', LEGACY_SUNSET);
  response.headers.set('Link', '</docs/API_LEGACY_POLICY.md>; rel="deprecation"');
  return response;
}

export function legacyJsonHeaders(contentType: string = 'application/json'): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Deprecation': 'true',
    'Sunset': LEGACY_SUNSET,
    'Link': '</docs/API_LEGACY_POLICY.md>; rel="deprecation"'
  };
}
