/**
 * React hook for API error handling
 */

import { useState, useCallback } from 'react';
import { type AppError, unknownToAppError } from './error-handling';


interface UseApiErrorOptions {
  showToast?: boolean;
  lang?: 'tr' | 'en';
  onError?: (error: AppError) => void;
}

export function useApiError(options: UseApiErrorOptions = {}) {
  const {
    showToast = true,
    lang = 'tr',
    onError
  } = options;

  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback(
    (err: unknown, _context?: string) => {
      const appError = unknownToAppError(err);
      setError(appError);

      onError?.(appError);
    },
    [showToast, lang, onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      context?: string
    ): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);
        return await asyncFn();
      } catch (err) {
        handleError(err, context);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  return {
    error,
    isLoading,
    clearError,
    handleError,
    executeAsync
  };
}

/**
 * Hook for form submission error handling
 */
export function useFormError(options: UseApiErrorOptions = {}) {
  const api = useApiError(options);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async <T,>(
      submitFn: () => Promise<T>,
      onSuccess?: (result: T) => void
    ) => {
      try {
        setIsSubmitting(true);
        api.clearError();
        const result = await submitFn();
        onSuccess?.(result);
        return result;
      } catch (err) {
        api.handleError(err, 'Form submission');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [api]
  );

  return {
    ...api,
    isSubmitting,
    handleSubmit
  };
}
