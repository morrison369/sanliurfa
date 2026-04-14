/**
 * Hata Sınırı Bileşeni (Error Boundary)
 *
 * React hatalarını yakalar, kullanıcı dostu bir arayüz gösterir
 * ve hata takip sistemine raporlar.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException, addBreadcrumb } from '../lib/error-tracking';

interface Props {
  children: ReactNode;
  /** Özel başlık mesajı */
  fallbackTitle?: string;
  /** Özel açıklama mesajı */
  fallbackDescription?: string;
  /** Hata durumunda gösterilecek özel bileşen */
  fallbackComponent?: ReactNode;
  /** Hata durumunda callback fonksiyonu */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Yeniden deneme callback fonksiyonu */
  onRetry?: () => void;
  /** Hata raporlamasını devre dışı bırak */
  disableReporting?: boolean;
  /** Sadece geliştirme modunda hata göster */
  showDetailsInDev?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

/**
 * Varsayılan hata arayüzü bileşeni
 */
function DefaultErrorFallback({
  error,
  eventId,
  onRetry,
  showDetails,
}: {
  error: Error | null;
  eventId: string | null;
  onRetry: () => void;
  showDetails: boolean;
}) {
  return (
    <div
      style={{
        padding: '2rem',
        margin: '2rem auto',
        maxWidth: '600px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '0.5rem',
        textAlign: 'center',
      }}
    >
      {/* Hata ikonu */}
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>

      {/* Başlık */}
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#991b1b',
          marginBottom: '0.5rem',
        }}
      >
        Bir Şeyler Ters Gitti
      </h2>

      {/* Açıklama */}
      <p
        style={{
          color: '#7f1d1d',
          marginBottom: '1.5rem',
          lineHeight: '1.6',
        }}
      >
        Üzgünüz, bu bileşen yüklenirken beklenmeyen bir hata oluştu.
        Lütfen tekrar deneyin veya daha sonra geri gelin.
      </p>

      {/* Hata detayları (sadece geliştirme modunda) */}
      {showDetails && error && (
        <details
          style={{
            marginBottom: '1rem',
            textAlign: 'left',
            backgroundColor: '#fff',
            padding: '1rem',
            borderRadius: '0.375rem',
            border: '1px solid #e5e7eb',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem',
            }}
          >
            Hata Detayları (Geliştirici)
          </summary>
          <pre
            style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: '#dc2626',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.toString()}
            {error.stack && (
              <>
                {'\n\n'}
                {error.stack}
              </>
            )}
          </pre>
        </details>
      )}

      {/* Olay ID */}
      {eventId && (
        <p
          style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginBottom: '1rem',
          }}
        >
          Hata ID: {eventId}
          <br />
          Destek ekibiyle paylaşmanız gerekebilir.
        </p>
      )}

      {/* Yeniden dene butonu */}
      <button
        onClick={onRetry}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#b91c1c';
        }}
        onMouseOut={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
        }}
      >
        Tekrar Dene
      </button>
    </div>
  );
}

/**
 * Error Boundary bileşeni
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  /**
   * Hata yakalama - Render sırasında hataları yakalar
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Hata yakalandığında çalışır
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // State'i güncelle
    this.setState({
      errorInfo,
    });

    // Hata detaylarını breadcrumb olarak ekle
    addBreadcrumb({
      message: 'React Error Boundary yakaladı',
      category: 'react_error',
      level: 'error',
      data: {
        componentName: this.constructor.name,
        errorName: error.name,
        errorMessage: error.message,
      },
    });

    // Hata raporlama
    if (!this.props.disableReporting) {
      const eventId = captureException(error, {
        tags: {
          'error.type': 'react_boundary',
          'error.source': 'component_render',
        },
        extra: {
          componentStack: errorInfo.componentStack,
          props: this.props,
        },
      });

      this.setState({ eventId });
    }

    // Özel error callback'i çağır
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Konsola logla (geliştirme modunda)
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary] Yakalanan hata:', error);
      console.error('[ErrorBoundary] Bileşen yığını:', errorInfo.componentStack);
    }
  }

  /**
   * Sayfayı yeniden yükleyerek yeniden dene
   */
  handleRetry = (): void => {
    if (this.props.onRetry) {
      // Özel retry fonksiyonu varsa onu çağır
      this.props.onRetry();
    } else {
      // Yoksa sayfayı yenile
      window.location.reload();
    }

    // State'i sıfırla
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Özel fallback bileşen varsa onu göster
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Varsayılan fallback bileşenini göster
      return (
        <DefaultErrorFallback
          error={this.state.error}
          eventId={this.state.eventId}
          onRetry={this.handleRetry}
          showDetails={
            this.props.showDetailsInDev !== false &&
            process.env.NODE_ENV !== 'production'
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Hook tabanlı alternatif - Fonksiyon bileşenleri için
 * Kullanım: tryCatch ile sarmalanmış bileşenler
 */
export function withErrorBoundary<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>,
): React.ComponentType<P> {
  return class WithErrorBoundary extends React.Component<P> {
    render(): ReactNode {
      return (
        <ErrorBoundary {...errorBoundaryProps}>
          <WrappedComponent {...(this.props as P)} />
        </ErrorBoundary>
      );
    }
  };
}
