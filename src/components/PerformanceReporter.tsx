/**
 * Performans Raporlayıcı Bileşeni
 *
 * İstemci tarafında Core Web Vitals ve sayfa yükleme
 * metriklerini takip eder, raporlar.
 */

import { useEffect, useRef, useState } from 'react';
import {
  observeWebVitals,
  getNavigationTiming,
  getPageLoadTime,
  getDomReadyTime,
  getMetricRating,
  getMetricColor,
  getMetricUnit,
  generatePerformanceReport,
  sendPerformanceReport,
  type MetricType,
} from '../lib/performance-tracking';

/**
 * Metrik kartı bileşeni
 */
function MetricCard({
  name,
  value,
  rating,
}: {
  name: string;
  value: number | null;
  rating: 'good' | 'needs-improvement' | 'poor' | null;
}) {
  const unit = name === 'CLS' ? '' : 'ms';
  const displayValue =
    value !== null
      ? name === 'CLS'
        ? value.toFixed(3)
        : Math.round(value)
      : '—';

  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: '0.375rem',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          marginBottom: '0.25rem',
          fontWeight: '500',
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: rating ? getMetricColor(rating) : '#9ca3af',
        }}
      >
        {displayValue}
        {unit && (
          <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>{unit}</span>
        )}
      </div>
      {rating && (
        <div
          style={{
            fontSize: '0.625rem',
            color: getMetricColor(rating),
            marginTop: '0.25rem',
            textTransform: 'uppercase',
            fontWeight: '600',
          }}
        >
          {rating === 'good'
            ? 'İyi'
            : rating === 'needs-improvement'
              ? 'Geliştirilmeli'
              : 'Kötü'}
        </div>
      )}
    </div>
  );
}

/**
 * Performans Raporlayıcı bileşeni
 */
export default function PerformanceReporter({
  enabled = process.env.NODE_ENV !== 'production',
  showUI = false,
  sendToApi = false,
  apiEndpoint = '/api/performance',
}: {
  /** Performans takibini etkinleştir */
  enabled?: boolean;
  /** UI göster (geliştirme modu için) */
  showUI?: boolean;
  /** API'ye gönder */
  sendToApi?: boolean;
  /** API endpoint'i */
  apiEndpoint?: string;
}) {
  const [metrics, setMetrics] = useState<
    Record<string, { value: number; rating: string }>
  >({});
  const [pageLoadTime, setPageLoadTime] = useState<number | null>(null);
  const [domReadyTime, setDomReadyTime] = useState<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const hasSentReportRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // Web Vitals observer başlat
    cleanupRef.current = observeWebVitals((metric) => {
      setMetrics((prev) => ({
        ...prev,
        [metric.name]: {
          value: metric.value,
          rating: metric.rating,
        },
      }));

      // Geliştirme modunda konsola yazdır
      if (process.env.NODE_ENV !== 'production') {
        const unit = getMetricUnit(metric.name as MetricType);
        console.debug(
          `[Performans] ${metric.name}: ${metric.value.toFixed(metric.name === 'CLS' ? 3 : 0)}${unit}`,
          `(${metric.rating})`,
        );
      }
    });

    // Sayfa yükleme metriklerini al
    const loadTime = getPageLoadTime();
    const domReady = getDomReadyTime();

    if (loadTime !== null) {
      setPageLoadTime(Math.round(loadTime));
    }

    if (domReady !== null) {
      setDomReadyTime(Math.round(domReady));
    }

    // API'ye rapor gönder
    if (sendToApi && !hasSentReportRef.current) {
      hasSentReportRef.current = true;

      // Sayfa tamamen yüklendikten sonra gönder
      const timeoutId = setTimeout(() => {
        const report = generatePerformanceReport();
        sendPerformanceReport(report, apiEndpoint).catch(() => {
          // Sessizce başarısız ol
        });
      }, 3000);

      return () => {
        clearTimeout(timeoutId);
        cleanupRef.current?.();
      };
    }

    return () => {
      cleanupRef.current?.();
    };
  }, [enabled, sendToApi, apiEndpoint]);

  // Takip devre dışıysa veya UI gösterilmeyecekse null döndür
  if (!enabled || !showUI) {
    return null;
  }

  // Navigasyon zamanlamasını al
  const navTiming = getNavigationTiming();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '1rem',
        minWidth: '280px',
        maxWidth: '320px',
        fontSize: '0.875rem',
      }}
    >
      {/* Başlık */}
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Performans Metrikleri
      </div>

      {/* Web Vitals Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        <MetricCard
          name="FCP"
          value={metrics.FCP?.value ?? null}
          rating={metrics.FCP?.rating as 'good' | 'needs-improvement' | 'poor' | null}
        />
        <MetricCard
          name="LCP"
          value={metrics.LCP?.value ?? null}
          rating={metrics.LCP?.rating as 'good' | 'needs-improvement' | 'poor' | null}
        />
        <MetricCard
          name="CLS"
          value={metrics.CLS?.value ?? null}
          rating={metrics.CLS?.rating as 'good' | 'needs-improvement' | 'poor' | null}
        />
        <MetricCard
          name="FID"
          value={metrics.FID?.value ?? null}
          rating={metrics.FID?.rating as 'good' | 'needs-improvement' | 'poor' | null}
        />
        <MetricCard
          name="INP"
          value={metrics.INP?.value ?? null}
          rating={metrics.INP?.rating as 'good' | 'needs-improvement' | 'poor' | null}
        />
        <MetricCard
          name="TTFB"
          value={metrics.TTFB?.value ?? null}
          rating={metrics.TTFB?.rating as 'good' | 'needs-improvement' | 'poor' | null}
        />
      </div>

      {/* Sayfa Yükleme Süreleri */}
      {(pageLoadTime !== null || domReadyTime !== null) && (
        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem',
            }}
          >
            Sayfa Yükleme
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}
          >
            <span>DOM Hazır:</span>
            <span style={{ fontWeight: '600', color: '#374151' }}>
              {domReadyTime !== null ? `${domReadyTime}ms` : '—'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem',
            }}
          >
            <span>Tam Yükleme:</span>
            <span style={{ fontWeight: '600', color: '#374151' }}>
              {pageLoadTime !== null ? `${pageLoadTime}ms` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Navigasyon Zamanlaması */}
      {navTiming && (
        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: '0.75rem',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem',
            }}
          >
            Navigasyon Detayı
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.25rem 0.5rem',
              fontSize: '0.625rem',
              color: '#6b7280',
            }}
          >
            <span>DNS:</span>
            <span style={{ fontWeight: '500', color: '#374151' }}>
              {Math.round(navTiming.dnsLookup)}ms
            </span>
            <span>TCP:</span>
            <span style={{ fontWeight: '500', color: '#374151' }}>
              {Math.round(navTiming.tcpConnection)}ms
            </span>
            <span>TLS:</span>
            <span style={{ fontWeight: '500', color: '#374151' }}>
              {Math.round(navTiming.tlsNegotiation)}ms
            </span>
            <span>TTFB:</span>
            <span style={{ fontWeight: '500', color: '#374151' }}>
              {Math.round(navTiming.firstByte)}ms
            </span>
          </div>
        </div>
      )}

      {/* API Gönderim Durumu */}
      {sendToApi && (
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e5e7eb',
            fontSize: '0.625rem',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          {hasSentReportRef.current
            ? 'Rapor gönderildi'
            : 'Rapor gönderiliyor...'}
        </div>
      )}
    </div>
  );
}

/**
 * Sadece metrik toplayan, UI göstermeyen bileşen
 */
export function PerformanceTracker({
  sendToApi = false,
  apiEndpoint = '/api/performance',
}: {
  sendToApi?: boolean;
  apiEndpoint?: string;
}) {
  return (
    <PerformanceReporter
      enabled={true}
      showUI={false}
      sendToApi={sendToApi}
      apiEndpoint={apiEndpoint}
    />
  );
}
