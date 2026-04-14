/**
 * Error Boundary Component
 * Catches JavaScript errors and displays fallback UI
 */

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to monitoring
    fetch('/api/errors/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Bir Hata Oluştu
            </h1>
            
            <p className="text-gray-600 mb-6">
              Üzgünüz, bir şeyler yanlış gitti. Lütfen tekrar deneyin veya ana sayfaya dönün.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded text-left overflow-auto">
                <p className="text-sm font-mono text-red-600">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Ana Sayfa
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Async Error Handler Hook
 */
export function useAsyncError() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((err: Error) => {
    setError(err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

import { useState, useCallback } from 'react';

/**
 * Section Error Boundary - For smaller sections
 */
export function SectionErrorBoundary({ 
  children, 
  title = 'Bir hata oluştu' 
}: { 
  children: ReactNode; 
  title?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">{title}</h3>
          <p className="text-red-600 text-sm">
            Bu bölüm yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
