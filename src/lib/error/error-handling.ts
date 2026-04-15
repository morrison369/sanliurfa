import { logger } from '../logging';
/**
 * Comprehensive error handling and user feedback system
 * SADECE Türkçe - Çok dilli destek KALDIRILMIŞTIR
 * 
 * @see AGENTS.md - Yasaklar bölümü
 */

export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: Record<string, any>;
  code?: string;
  statusCode?: number;
  userMessage?: string;
  retryable?: boolean;
  timestamp: Date;
}

/**
 * User-friendly error messages in Turkish ONLY
 * NOT: Çok dilli destek KALDIRILMIŞTIR
 */
const errorMessages: Record<ErrorType, { tr: string; userMessage?: string }> = {
  [ErrorType.VALIDATION]: {
    tr: 'Girdi doğrulaması başarısız',
    userMessage: 'Lütfen bilgilerinizi kontrol edin ve tekrar deneyin'
  },
  [ErrorType.AUTHENTICATION]: {
    tr: 'Kimlik doğrulama başarısız',
    userMessage: 'Lütfen giriş yapın'
  },
  [ErrorType.AUTHORIZATION]: {
    tr: 'Yetkilendirme başarısız',
    userMessage: 'Bu işlemi yapmaya izniniz yok'
  },
  [ErrorType.NOT_FOUND]: {
    tr: 'Bulunamadı',
    userMessage: 'Aradığınız öğe bulunamadı'
  },
  [ErrorType.CONFLICT]: {
    tr: 'Çakışma',
    userMessage: 'Bu işlem tamamlanamadı. Lütfen sayfayı yenileyin ve tekrar deneyin'
  },
  [ErrorType.RATE_LIMIT]: {
    tr: 'Çok fazla istek',
    userMessage: 'Çok hızlı işlem yaptınız. Lütfen biraz bekleyin'
  },
  [ErrorType.SERVER_ERROR]: {
    tr: 'Sunucu hatası',
    userMessage: 'Sunucuda bir hata oluştu. Lütfen daha sonra tekrar deneyin'
  },
  [ErrorType.NETWORK_ERROR]: {
    tr: 'Ağ hatası',
    userMessage: 'İnternet bağlantınızı kontrol edin'
  },
  [ErrorType.TIMEOUT]: {
    tr: 'Zaman aşımı',
    userMessage: 'İstek çok uzun sürdü. Lütfen tekrar deneyin'
  },
  [ErrorType.UNKNOWN]: {
    tr: 'Bilinmeyen hata',
    userMessage: 'Bir hata oluştu. Lütfen tekrar deneyin'
  }
};

/**
 * Classify error by HTTP status code
 */
export function classifyErrorByStatus(statusCode: number): ErrorType {
  if (statusCode === 400) return ErrorType.VALIDATION;
  if (statusCode === 401) return ErrorType.AUTHENTICATION;
  if (statusCode === 403) return ErrorType.AUTHORIZATION;
  if (statusCode === 404) return ErrorType.NOT_FOUND;
  if (statusCode === 409) return ErrorType.CONFLICT;
  if (statusCode === 429) return ErrorType.RATE_LIMIT;
  if (statusCode >= 500) return ErrorType.SERVER_ERROR;
  return ErrorType.UNKNOWN;
}

/**
 * Create standardized AppError
 */
export function createAppError(
  type: ErrorType,
  message: string,
  statusCode?: number,
  details?: Record<string, any>
): AppError {
  return {
    type,
    message,
    statusCode,
    details,
    retryable: isRetryable(type),
    timestamp: new Date()
  };
}

/**
 * Check if error is retryable
 */
export function isRetryable(type: ErrorType): boolean {
  return [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT,
    ErrorType.RATE_LIMIT,
    ErrorType.SERVER_ERROR
  ].includes(type);
}

/**
 * Get user-friendly message (Turkish ONLY)
 * @deprecated lang parametresi kaldırıldı. Sadece Türkçe döndürülür.
 */
export function getUserMessage(type: ErrorType, _lang?: 'tr'): string {
  const msg = errorMessages[type];
  return msg?.userMessage || msg?.tr || errorMessages[ErrorType.UNKNOWN].tr;
}

/**
 * Get debug message (technical, for logging)
 * SABİT: Sadece Türkçe
 */
export function getDebugMessage(type: ErrorType): string {
  return errorMessages[type]?.tr || errorMessages[ErrorType.UNKNOWN].tr;
}

/**
 * Normalize API error response
 */
export function normalizeApiError(response: any): AppError {
  const statusCode = response.status || 500;
  const type = classifyErrorByStatus(statusCode);

  let message = '';
  let details: Record<string, any> | undefined;

  if (response.data?.error) {
    message = response.data.error;
  } else if (response.data?.message) {
    message = response.data.message;
  } else if (response.statusText) {
    message = response.statusText;
  } else {
    message = `HTTP ${statusCode}`;
  }

  if (response.data?.errors) {
    details = response.data.errors;
  }

  return createAppError(type, message, statusCode, details);
}

/**
 * Handle fetch errors with retry logic
 */
export async function fetchWithErrorHandling(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        )
      ]);

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on validation errors
      if (
        lastError.message.includes('400') ||
        lastError.message.includes('401') ||
        lastError.message.includes('403') ||
        lastError.message.includes('404')
      ) {
        throw error;
      }

      // Wait before retrying
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T = unknown>(json: string, defaultValue?: T): T | undefined {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.warn('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * Format error for display (Turkish ONLY)
 * @deprecated lang parametresi kaldırıldı. Sadece Türkçe döndürülür.
 */
export function formatErrorForDisplay(error: AppError, _lang?: 'tr'): {
  title: string;
  message: string;
  action?: string;
} {
  return {
    title: getDebugMessage(error.type),
    message: error.userMessage || getUserMessage(error.type),
    action: error.retryable ? 'Tekrar Dene' : undefined
  };
}

/**
 * Error context for React components
 */
export interface ErrorContextValue {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  handleError: (error: unknown, context?: string) => void;
}

/**
 * Convert unknown error to AppError
 */
export function unknownToAppError(error: unknown, context?: string): AppError {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return createAppError(ErrorType.TIMEOUT, error.message);
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return createAppError(ErrorType.NETWORK_ERROR, error.message);
    }
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    if (err.status || err.statusCode) {
      return createAppError(
        classifyErrorByStatus(err.status || err.statusCode),
        err.message || String(error),
        err.status || err.statusCode
      );
    }
  }

  return createAppError(
    ErrorType.UNKNOWN,
    String(error),
    undefined,
    context ? { context } : undefined
  );
}
