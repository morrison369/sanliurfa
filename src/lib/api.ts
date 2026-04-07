// API utilities for standardized responses and request validation

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
  data: any,
  statusCode: number = 200,
  requestId?: string
): Response {
  const [body, status, headers] = successResponse(data, statusCode, requestId);
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Create a standardized error response
 */
export function apiError(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, any>,
  requestId?: string
): Response {
  const [body, status, headers] = errorResponse(code, message, statusCode, details, requestId);
  return new Response(JSON.stringify(body), { status, headers });
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
export function getRequestId(context: APIContext): string {
  return context.request.headers.get('x-request-id') || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED'
} as const;
