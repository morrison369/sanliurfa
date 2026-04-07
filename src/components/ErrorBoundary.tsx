/**
 * Error Boundary component for React
 * Catches errors in child components and displays fallback UI
 */

import React, { ReactNode, ReactElement } from 'react';
import { logger } from '../lib/logging';
import { unknownToAppError } from '../lib/error-handling';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error
    logger.error('Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>

                <h3 className="mt-4 text-center text-lg font-medium text-gray-900">
                  Bir Hata Oluştu
                </h3>

                <p className="mt-2 text-center text-sm text-gray-600">
                  Sayfayı yenileyerek tekrar deneyin. Sorun devam ederse, lütfen destek ekibine başvurun.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sayfayı Yenile
                  </button>

                  <button
                    onClick={() => window.history.back()}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Geri Git
                  </button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mt-6 p-4 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-48">
                    <p className="font-bold mb-2">Error Details (Dev Only):</p>
                    <p>{this.state.error.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
