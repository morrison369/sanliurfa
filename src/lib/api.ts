// API utilities for standardized responses and request validation

import { randomBytes } from 'node:crypto';
import type { APIContext } from 'astro';

/**
 * Standard API response envelope
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Success response formatter
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  requestId?: string
): [T, number, Record<string, string>] {
  const response: ApiResponse<T> = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }

  return [response as any, statusCode, headers];
}

/**
 * Paginated response formatter
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
  statusCode: number = 200,
  requestId?: string
): [PaginatedResponse<T>, number, Record<string, string>] {
  const response: any = {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }

  return [response, statusCode, headers];
}

/**
 * Error response formatter
 */
export function errorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, any>,
  requestId?: string
): [ApiResponse, number, Record<string, string>] {
  const response: ApiResponse = {
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }

  return [response, statusCode, headers];
}

/**
 * Create a standardized API route response
 */
export function apiResponse(
  dataOrContext: any,
  statusCodeOrData?: number | any,
  requestId?: string,
  extraHeaders?: Record<string, string>
): Response {
  // Handle both signatures: apiResponse(data, statusCode) and apiResponse(context, data, statusCode)
  let data: any;
  let statusCode: number;

  if (statusCodeOrData && typeof statusCodeOrData === 'object') {
    // Signature: apiResponse(context, data, statusCode)
    data = statusCodeOrData;
    statusCode = requestId ? (Number(requestId) || 200) : 200;
  } else {
    // Signature: apiResponse(data, statusCode)
    data = dataOrContext;
    statusCode = statusCodeOrData || 200;
  }

  const [body, status, headers] = successResponse(data, statusCode, undefined);
  return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extraHeaders } });
}

/**
 * Create a standardized error response
 */
export function apiError(
  codeOrContext: string | any,
  messageOrCode?: string | number,
  statusCodeOrMessage?: number | string,
  details?: Record<string, any>,
  requestId?: string
): Response {
  // Handle multiple signatures
  let code: string;
  let message: string;
  let statusCode: number;
  
  if (typeof codeOrContext === 'object' && codeOrContext !== null) {
    // Signature: apiError(context, statusCode, message)
    code = 'ERROR';
    statusCode = typeof messageOrCode === 'number' ? messageOrCode : 400;
    message = typeof statusCodeOrMessage === 'string' ? statusCodeOrMessage : 'An error occurred';
  } else {
    // Signature: apiError(code, message, statusCode, details, requestId)
    code = codeOrContext as string;
    message = (messageOrCode as string) || 'An error occurred';
    statusCode = (statusCodeOrMessage as number) || 400;
  }
  
  const [body, status, headers] = errorResponse(code, message, statusCode, details, requestId);
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * RFC 7807 / problem+json response
 */
export function problemJson(input: {
  status: number;
  title: string;
  detail?: string;
  type?: string;
  instance?: string;
  extensions?: Record<string, unknown>;
}): Response {
  const payload: Record<string, unknown> = {
    type: input.type || 'about:blank',
    title: input.title,
    status: input.status,
  };
  if (input.detail) payload.detail = input.detail;
  if (input.instance) payload.instance = input.instance;
  if (input.extensions) {
    for (const [k, v] of Object.entries(input.extensions)) payload[k] = v;
  }

  return new Response(JSON.stringify(payload), {
    status: input.status,
    headers: {
      'Content-Type': 'application/problem+json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Production'da DB/internal error mesajlarını sızdırmadan, dev'de okunabilir
 * detail döndürür. Asla doğrudan `error.message` döndürme — şema/path/stack
 * leak edebilir (örn: `duplicate key violates constraint "users_email_key"`).
 *
 * Prod davranışı: sadece `fallback` döner.
 * Dev/test davranışı: `error.message` (varsa) → fallback'a düşer.
 *
 * Kullanım:
 * ```
 * } catch (error) {
 *   logger.error('failed', error instanceof Error ? error : new Error(String(error)));
 *   return problemJson({
 *     status: 500,
 *     title: 'Sunucu Hatası',
 *     detail: safeErrorDetail(error, 'Sunucu hatası, lütfen tekrar deneyin'),
 *     ...
 *   });
 * }
 * ```
 */
export function safeErrorDetail(error: unknown, fallback: string): string {
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProduction) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

/**
 * Safely parse integer from query/body input with NaN guard + range bound.
 *
 * **Why**: `Math.max(1, parseInt('abc'))` → `NaN`. SQL'e NaN bind value
 * undefined behavior (PostgreSQL crash, silent NULL, wrong result).
 *
 * Pattern: `parseInt('abc', 10) === NaN`, `Number.isFinite(NaN) === false`.
 * Fallback'a düş + min/max clamp.
 *
 * Kullanım:
 * ```
 * const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 100);
 * const offset = safeIntParam(body.offset, 0, 0, 10000);
 * ```
 *
 * @param input - raw user input (string, number, null, undefined, anything)
 * @param defaultVal - kullanılacak default eğer input invalid
 * @param min - minimum allowed value (clamp)
 * @param max - maximum allowed value (clamp)
 */
export function safeIntParam(
  input: unknown,
  defaultVal: number,
  min: number,
  max: number,
): number {
  if (input === null || input === undefined || input === '') return defaultVal;
  const parsed = typeof input === 'number' ? input : parseInt(String(input), 10);
  const safe = Number.isFinite(parsed) ? parsed : defaultVal;
  return Math.min(max, Math.max(min, safe));
}

/**
 * HARD RULE #17 — float variant: NaN-safe float parsing from URL search params.
 * Null / undefined / '' / Infinity / NaN → defaultVal. Result clamped to [min, max].
 */
export function safeFloatParam(
  input: unknown,
  defaultVal: number,
  min: number,
  max: number,
): number {
  if (input === null || input === undefined || input === '') return defaultVal;
  const parsed = typeof input === 'number' ? input : parseFloat(String(input));
  const safe = Number.isFinite(parsed) ? parsed : defaultVal;
  return Math.min(max, Math.max(min, safe));
}

/**
 * Extract and validate request body
 */
export async function getValidatedBody<T>(
  request: Request,
  validator?: (data: any) => T | null
): Promise<{ data: T | null; error: string | null }> {
  try {
    const text = await request.text();
    const data = JSON.parse(text);

    if (validator) {
      const validated = validator(data);
      if (!validated) {
        return { data: null, error: 'Validation failed' };
      }
      return { data: validated, error: null };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: 'Invalid JSON' };
  }
}

/**
 * Common validation schemas
 */
export const validators = {
  /**
   * Validate email format
   */
  email: (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  /**
   * Validate string with length constraints
   */
  string: (value: any, min: number = 1, max: number = 255): boolean => {
    if (typeof value !== 'string') return false;
    return value.length >= min && value.length <= max;
  },

  /**
   * Validate number range
   */
  number: (value: any, min?: number, max?: number): boolean => {
    if (typeof value !== 'number') return false;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  },

  /**
   * Validate UUID format
   */
  uuid: (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  },

  /**
   * Validate required field
   */
  required: (value: any): boolean => {
    return value !== null && value !== undefined && value !== '';
  }
};

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Extract request ID or generate one
 */
export function getRequestId(contextOrRequest?: APIContext | Request | { request?: Request } | null): string {
  const request =
    contextOrRequest instanceof Request
      ? contextOrRequest
      : (contextOrRequest as APIContext | { request?: Request } | null | undefined)?.request;

  return (
    request?.headers?.get('x-request-id') ||
    `req-${Date.now()}-${randomBytes(6).toString('hex')}`
  );
}

/**
 * Common HTTP status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Common error codes
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  AUTH_REQUIRED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTH_FAILED: 'AUTHENTICATION_FAILED'
} as const;
