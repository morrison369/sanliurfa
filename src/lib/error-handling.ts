/**
 * Error Handling Utilities
 * Centralized error processing and formatting
 */

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  originalError?: Error;
}

export function unknownToAppError(error: unknown): AppError {
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      originalError: error
    };
  }
  
  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN_ERROR',
      message: error
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    details: { originalValue: error }
  };
}

export interface ErrorDisplayInfo {
  title: string;
  message: string;
  action?: string;
}

export function formatErrorForDisplay(error: unknown, _lang?: string): ErrorDisplayInfo {
  const appError = unknownToAppError(error);
  return {
    title: 'Hata',
    message: appError.message,
    action: appError.code === 'UNKNOWN_ERROR' ? 'Tekrar Dene' : undefined
  };
}

export function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && 
         error !== null && 
         'code' in error && 
         'message' in error;
}

export function createError(code: string, message: string, details?: Record<string, unknown>): AppError {
  return { code, message, details };
}

// HTTP status code mapping
export const httpStatusCodes = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export default unknownToAppError;
