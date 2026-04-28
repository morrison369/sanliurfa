/**
 * API Versioning Middleware
 * Supports multiple versioning strategies: URL path, header, and query param
 */

export type VersioningStrategy = 'url' | 'header' | 'query';

export interface ApiVersionConfig {
  currentVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  sunsetVersions: string[];
  defaultVersion: string;
  strategy: VersioningStrategy;
  headerName?: string;
  queryParam?: string;
}

const defaultConfig: ApiVersionConfig = {
  currentVersion: 'v1',
  supportedVersions: ['v1'],
  deprecatedVersions: [],
  sunsetVersions: [],
  defaultVersion: 'v1',
  strategy: 'url',
  headerName: 'X-API-Version',
  queryParam: 'api-version',
};

class ApiVersionManager {
  private config: ApiVersionConfig;

  constructor(config: Partial<ApiVersionConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Extract version from URL path
   * e.g., /api/v1/users -> v1
   */
  private extractVersionFromUrl(url: URL): string | null {
    const match = url.pathname.match(/\/api\/(v\d+)(?:\/|$)/);
    return match ? match[1] : null;
  }

  /**
   * Extract version from header
   */
  private extractVersionFromHeader(headers: Headers): string | null {
    return headers.get(this.config.headerName!) || null;
  }

  /**
   * Extract version from query parameter
   */
  private extractVersionFromQuery(url: URL): string | null {
    return url.searchParams.get(this.config.queryParam!) || null;
  }

  /**
   * Determine API version from request
   */
  getVersion(request: Request): string {
    const url = new URL(request.url);
    const headers = request.headers;
    
    let version: string | null = null;

    switch (this.config.strategy) {
      case 'url':
        version = this.extractVersionFromUrl(url);
        break;
      case 'header':
        version = this.extractVersionFromHeader(headers);
        break;
      case 'query':
        version = this.extractVersionFromQuery(url);
        break;
    }

    return version || this.config.defaultVersion;
  }

  /**
   * Check if version is supported
   */
  isSupported(version: string): boolean {
    return this.config.supportedVersions.includes(version);
  }

  /**
   * Check if version is deprecated
   */
  isDeprecated(version: string): boolean {
    return this.config.deprecatedVersions.includes(version);
  }

  /**
   * Check if version is sunset (no longer available)
   */
  isSunset(version: string): boolean {
    return this.config.sunsetVersions.includes(version);
  }

  /**
   * Check if version is current
   */
  isCurrent(version: string): boolean {
    return version === this.config.currentVersion;
  }

  /**
   * Get version status
   */
  getVersionStatus(version: string): 'current' | 'supported' | 'deprecated' | 'sunset' | 'unknown' {
    if (this.isCurrent(version)) return 'current';
    if (this.isSunset(version)) return 'sunset';
    if (this.isDeprecated(version)) return 'deprecated';
    if (this.isSupported(version)) return 'supported';
    return 'unknown';
  }

  /**
   * Get sunset date for deprecated version
   */
  getSunsetDate(version: string): string | null {
    // In production, this would come from a database or config
    const sunsetDates: Record<string, string> = {
      'v0': '2026-06-01',
    };
    return sunsetDates[version] || null;
  }

  /**
   * Build version headers for response
   */
  buildVersionHeaders(version: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-API-Version': version,
      'X-API-Latest-Version': this.config.currentVersion,
    };

    const status = this.getVersionStatus(version);

    if (status === 'deprecated') {
      headers['Deprecation'] = 'true';
      const sunsetDate = this.getSunsetDate(version);
      if (sunsetDate) {
        headers['Sunset'] = sunsetDate;
      }
    }

    if (status === 'sunset') {
      headers['Sunset'] = 'true';
    }

    return headers;
  }

  /**
   * Create error response for unsupported version
   */
  createUnsupportedVersionResponse(version: string): Response {
    return new Response(
      JSON.stringify({
        error: 'Unsupported API Version',
        message: `API version '${version}' is not supported.`,
        supportedVersions: this.config.supportedVersions,
        currentVersion: this.config.currentVersion,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...this.buildVersionHeaders(this.config.currentVersion),
        },
      }
    );
  }

  /**
   * Create error response for sunset version
   */
  createSunsetVersionResponse(version: string): Response {
    return new Response(
      JSON.stringify({
        error: 'API Version Sunset',
        message: `API version '${version}' has been retired. Please upgrade to ${this.config.currentVersion}.`,
        currentVersion: this.config.currentVersion,
        documentation: 'https://sanliurfa.com/api/docs',
      }),
      {
        status: 410, // Gone
        headers: {
          'Content-Type': 'application/json',
          ...this.buildVersionHeaders(this.config.currentVersion),
        },
      }
    );
  }

  /**
   * Middleware handler
   */
  async handle(request: Request, next: (version: string) => Promise<Response>): Promise<Response> {
    const version = this.getVersion(request);
    const status = this.getVersionStatus(version);

    // Check if version is sunset
    if (status === 'sunset') {
      return this.createSunsetVersionResponse(version);
    }

    // Check if version is supported
    if (status === 'unknown') {
      return this.createUnsupportedVersionResponse(version);
    }

    // Process request
    const response = await next(version);

    // Add version headers to response
    const headers = new Headers(response.headers);
    const versionHeaders = this.buildVersionHeaders(version);
    Object.entries(versionHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Rewrite URL to remove version from path (for internal routing)
   */
  rewriteUrl(url: string, version: string): string {
    return url.replace(`/api/${version}`, '/api');
  }
}

// Factory function
export function createApiVersion(config?: Partial<ApiVersionConfig>): ApiVersionManager {
  return new ApiVersionManager(config);
}

// Pre-configured instances
export const apiVersion = createApiVersion();

export const apiVersionV1 = createApiVersion({
  currentVersion: 'v1',
  supportedVersions: ['v1'],
  defaultVersion: 'v1',
  strategy: 'url',
});

// Future: when v2 is released
export const apiVersionV2 = createApiVersion({
  currentVersion: 'v2',
  supportedVersions: ['v1', 'v2'],
  deprecatedVersions: ['v1'],
  defaultVersion: 'v2',
  strategy: 'url',
});

// Astro middleware
export async function onRequest({ request }: any, next: () => Promise<Response>): Promise<Response> {
  return apiVersion.handle(request, async () => {
    return next();
  });
}

export default apiVersion;
