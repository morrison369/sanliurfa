/**
 * Error display components for forms and pages
 */

import React from 'react';
import { AppError, formatErrorForDisplay } from '../lib/error-handling';

/**
 * Inline error message (for form fields)
 */
export function FieldError({ message, fieldName }: { message?: string; fieldName?: string }) {
  if (!message) return null;

  return (
    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18.101 12.93l-.9-1.465A5.5 5.5 0 1 1 9.5 0a5.5 5.5 0 0 1 7.701 12.93zM9.5 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM9 9a1 1 0 1 1 2 0 1 1 0 0 1-2 0z" />
      </svg>
      {message}
    </p>
  );
}

/**
 * Form validation errors summary
 */
export function ValidationErrorsSummary({
  errors,
  title = 'Doğrulama Hataları'
}: {
  errors: Record<string, string[]> | string[];
  title?: string;
}) {
  const errorList = Array.isArray(errors)
    ? errors
    : Object.values(errors).flat();

  if (errorList.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
        </svg>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-2">{title}</h3>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
            {errorList.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * API error alert
 */
export function ErrorAlert({
  error,
  onDismiss,
  lang = 'tr'
}: {
  error: AppError;
  onDismiss?: () => void;
  lang?: 'tr' | 'en';
}) {
  const { title, message, action } = formatErrorForDisplay(error, lang);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
        </svg>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>

          {action && (
            <button
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
              onClick={onDismiss}
            >
              {action} →
            </button>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Loading state with retry on error
 */
export function LoadingState({
  isLoading,
  error,
  onRetry,
  children,
  lang = 'tr'
}: {
  isLoading: boolean;
  error?: AppError | null;
  onRetry?: () => void;
  children: React.ReactNode;
  lang?: 'tr' | 'en';
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
            <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ErrorAlert error={error} onDismiss={onRetry} lang={lang} />
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {lang === 'tr' ? 'Tekrar Dene' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Network status indicator
 */
export function NetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' && navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
        </svg>

        <div>
          <h3 className="text-sm font-medium text-yellow-800">İnternet Bağlantısı Yok</h3>
          <p className="text-xs text-yellow-700 mt-1">Bağlantınız restore olduğunda otomatik olarak senkronize olacaktır.</p>
        </div>
      </div>
    </div>
  );
}
