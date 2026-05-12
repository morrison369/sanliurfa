/**
 * Request ID Middleware
 * Distributed tracing and request correlation
 */

import { randomBytes, randomUUID } from 'crypto';

export interface RequestContext {
  requestId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

// AsyncLocalStorage for request context (Node.js 14.8+)
let asyncLocalStorage: any;
try {
  const { AsyncLocalStorage } = require('async_hooks');
  asyncLocalStorage = new AsyncLocalStorage();
} catch {
  // Fallback for older Node versions
  asyncLocalStorage = null;
}

class RequestContextManager {
  private contextStore = new Map<string, RequestContext>();

  /**
   * Generate unique request ID
   */
  generateRequestId(): string {
    return `req_${randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Generate trace ID (for distributed tracing)
   */
  generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generate span ID
   */
  generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  /**
   * Parse trace context from headers (W3C Trace Context)
   */
  parseTraceContext(headers: Headers): { traceId: string; parentSpanId?: string } | null {
    const traceparent = headers.get('traceparent');
    if (!traceparent) return null;

    // W3C format: version-traceId-parentSpanId-flags
    const parts = traceparent.split('-');
    if (parts.length >= 3) {
      return {
        traceId: parts[1],
        parentSpanId: parts[2],
      };
    }
    return null;
  }

  /**
   * Create request context from incoming request
   */
  createContext(request: Request): RequestContext {
    const headers = request.headers;
    
    // Check for existing trace context
    const existingContext = this.parseTraceContext(headers);
    
    // Check for custom request ID header
    const customRequestId = headers.get('x-request-id');
    
    const now = Date.now();
    
    return {
      requestId: customRequestId || this.generateRequestId(),
      traceId: existingContext?.traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      startTime: now,
      ...(existingContext?.parentSpanId ? { parentSpanId: existingContext.parentSpanId } : {}),
      ...(headers.get('user-agent') ? { userAgent: headers.get('user-agent')! } : {}),
      ...((headers.get('x-forwarded-for') || headers.get('x-real-ip'))
        ? { ip: headers.get('x-forwarded-for') || headers.get('x-real-ip')! }
        : {}),
    };
  }

  /**
   * Store context for current request
   */
  setContext(context: RequestContext): void {
    this.contextStore.set(context.requestId, context);
    
    if (asyncLocalStorage) {
      asyncLocalStorage.enterWith(context);
    }
  }

  /**
   * Get current request context
   */
  getCurrentContext(): RequestContext | undefined {
    if (asyncLocalStorage) {
      return asyncLocalStorage.getStore();
    }
    return undefined;
  }

  /**
   * Get context by request ID
   */
  getContext(requestId: string): RequestContext | undefined {
    return this.contextStore.get(requestId);
  }

  /**
   * Remove context
   */
  removeContext(requestId: string): void {
    this.contextStore.delete(requestId);
  }

  /**
   * Get response time
   */
  getResponseTime(context: RequestContext): number {
    return Date.now() - context.startTime;
  }

  /**
   * Build traceparent header value
   */
  buildTraceparent(context: RequestContext): string {
    const version = '00';
    const flags = '01'; // sampled
    return `${version}-${context.traceId}-${context.spanId}-${flags}`;
  }

  /**
   * Get all active contexts count
   */
  getActiveContextCount(): number {
    return this.contextStore.size;
  }

  /**
   * Clean up old contexts (memory management)
   */
  cleanupOldContexts(maxAgeMs: number = 300000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, context] of this.contextStore.entries()) {
      if (now - context.startTime > maxAgeMs) {
        this.contextStore.delete(id);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Singleton instance
export const requestContext = new RequestContextManager();

/**
 * Request ID middleware for API routes
 */
export async function requestIdMiddleware(
  request: Request,
  handler: (request: Request, context: RequestContext) => Promise<Response>
): Promise<Response> {
  const context = requestContext.createContext(request);
  requestContext.setContext(context);

  try {
    // Call the handler
    const response = await handler(request, context);

    // Add tracing headers to response
    const newHeaders = new Headers(response.headers);
    newHeaders.set('x-request-id', context.requestId);
    newHeaders.set('traceparent', requestContext.buildTraceparent(context));
    newHeaders.set('x-response-time', `${requestContext.getResponseTime(context)}ms`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } finally {
    requestContext.removeContext(context.requestId);
  }
}

/**
 * Astro middleware integration
 */
export async function onRequest({ request, cookies }: any, next: () => Promise<Response>): Promise<Response> {
  const context = requestContext.createContext(request);
  requestContext.setContext(context);

  // Store request ID in cookie for client-side correlation
  cookies.set('x-request-id', context.requestId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300, // 5 minutes
  });

  try {
    const response = await next();
    
    // Add tracing headers
    response.headers.set('x-request-id', context.requestId);
    response.headers.set('traceparent', requestContext.buildTraceparent(context));
    response.headers.set('x-response-time', `${requestContext.getResponseTime(context)}ms`);
    
    return response;
  } finally {
    requestContext.removeContext(context.requestId);
  }
}

export default requestContext;
