/**
 * CORS Middleware
 * Secure Cross-Origin Resource Sharing configuration
 */
function getCanonicalOrigin(): string {
  return process.env.SITE_URL || process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';
}
function getAllowedOriginsFromEnv(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

export interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

const defaultOptions: CorsOptions = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Request-ID',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-Request-ID', 'X-Response-Time', 'X-Total-Count'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

class CorsMiddleware {
  private options: CorsOptions;

  constructor(options: CorsOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    
    // Parse allowed origins from env if not provided
    if (this.options.allowedOrigins?.length === 0) {
      const envOrigins = process.env.ALLOWED_ORIGINS;
      if (envOrigins && envOrigins !== '*') {
        this.options.allowedOrigins = envOrigins.split(',').map(o => o.trim());
      }
    }
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    const { allowedOrigins } = this.options;
    
    // Allow all in development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // Check for wildcard
    if (allowedOrigins?.includes('*')) {
      return true;
    }
    
    // Check exact match
    if (allowedOrigins?.includes(origin)) {
      return true;
    }
    
    // Check pattern match (e.g., *.sanliurfa.com)
    return allowedOrigins?.some(allowed => {
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return origin.endsWith(domain) || origin === domain;
      }
      return false;
    }) || false;
  }

  /**
   * Get allowed origin header value
   */
  private getOriginHeader(requestOrigin: string | null): string | null {
    if (!requestOrigin) {
      return null;
    }
    
    if (this.isOriginAllowed(requestOrigin)) {
      return requestOrigin;
    }
    
    return null;
  }

  /**
   * Handle CORS preflight request
   */
  handlePreflight(request: Request): Response {
    const headers = new Headers();
    const requestOrigin = request.headers.get('origin');
    
    // Set origin
    const origin = this.getOriginHeader(requestOrigin);
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
    }
    
    // Set credentials
    if (this.options.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // Set methods
    headers.set('Access-Control-Allow-Methods', this.options.allowedMethods?.join(', ') || '');
    
    // Set allowed headers
    const requestedHeaders = request.headers.get('access-control-request-headers');
    if (requestedHeaders) {
      headers.set('Access-Control-Allow-Headers', requestedHeaders);
    } else {
      headers.set('Access-Control-Allow-Headers', this.options.allowedHeaders?.join(', ') || '');
    }
    
    // Set exposed headers
    if (this.options.exposedHeaders?.length) {
      headers.set('Access-Control-Expose-Headers', this.options.exposedHeaders.join(', '));
    }
    
    // Set max age
    headers.set('Access-Control-Max-Age', String(this.options.maxAge));
    
    // Add Vary header
    headers.set('Vary', 'Origin');
    
    return new Response(null, {
      status: this.options.optionsSuccessStatus,
      headers,
    });
  }

  /**
   * Apply CORS headers to response
   */
  applyCorsHeaders(request: Request, response: Response): Response {
    const headers = new Headers(response.headers);
    const requestOrigin = request.headers.get('origin');
    
    // Set origin
    const origin = this.getOriginHeader(requestOrigin);
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
    }
    
    // Set credentials
    if (this.options.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // Set exposed headers
    if (this.options.exposedHeaders?.length) {
      headers.set('Access-Control-Expose-Headers', this.options.exposedHeaders.join(', '));
    }
    
    // Add Vary header
    headers.set('Vary', 'Origin');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Main middleware handler
   */
  async handle(request: Request, next: () => Promise<Response>): Promise<Response> {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return this.handlePreflight(request);
    }
    
    // Handle actual request
    const response = await next();
    return this.applyCorsHeaders(request, response);
  }
}

// Factory function
export function createCors(options?: CorsOptions): CorsMiddleware {
  return new CorsMiddleware(options);
}

// Pre-configured instances
export const cors = createCors();

export const strictCors = createCors({
  allowedOrigins: getAllowedOriginsFromEnv(process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS),
  credentials: true,
});

export const apiCors = createCors({
  allowedOrigins: getAllowedOriginsFromEnv(process.env.CORS_ORIGINS || getCanonicalOrigin()),
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-API-Key',
    'X-CSRF-Token',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Response-Time',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  credentials: true,
  maxAge: 3600,
});

// Astro middleware
export async function onRequest({ request }: any, next: () => Promise<Response>): Promise<Response> {
  return cors.handle(request, next);
}

export default cors;
