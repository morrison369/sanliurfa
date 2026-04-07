/**
 * API Versioning Utilities
 * - Parse Accept-Version header
 * - Route versioning helpers
 */

export type ApiVersion = 'v1' | 'v2';

export function getApiVersion(request: Request): ApiVersion {
  const acceptVersion = request.headers.get('accept-version');
  if (acceptVersion === 'v2') {
    return 'v2';
  }
  return 'v1';
}

export function getVersionFromPath(path: string): ApiVersion {
  if (path.includes('/api/v2/')) {
    return 'v2';
  }
  return 'v1';
}

export const API_VERSIONS = {
  v1: {
    description: 'Stable API',
    deprecated: false
  },
  v2: {
    description: 'Next generation API (future)',
    deprecated: false
  }
} as const;
