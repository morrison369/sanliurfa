import { logger } from './logging';
/**
 * Performans Takip Altyapısı
 *
 * Web Vitals (FCP, LCP, CLS, FID, TTFB) raporlama,
 * navigasyon zamanlaması ve kaynak zamanlaması takibi.
 */

/**
 * Web Vitals metrik türleri
 */
export type MetricType = 'FCP' | 'LCP' | 'CLS' | 'FID' | 'INP' | 'TTFB';

/**
 * Tekil metrik verisi
 */
export interface Metric {
  name: MetricType;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  id: string;
  navigationType?: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

/**
 * Performans raporu
 */
export interface PerformanceReport {
  metrics: Record<MetricType, Metric | null>;
  navigationTiming: NavigationTiming | null;
  resourceTiming: ResourceTimingSummary[];
  timestamp: string;
  url: string;
  connectionInfo?: ConnectionInfo;
}

/**
 * Navigasyon zamanlaması
 */
export interface NavigationTiming {
  dnsLookup: number;
  tcpConnection: number;
  tlsNegotiation: number;
  request: number;
  response: number;
  domProcessing: number;
  pageLoad: number;
  domContentLoaded: number;
  firstByte: number;
}

/**
 * Kaynak zamanlaması özeti
 */
export interface ResourceTimingSummary {
  name: string;
  duration: number;
  transferSize: number;
  initiatorType: string;
}

/**
 * Bağlantı bilgisi
 */
export interface ConnectionInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

function withOptional<K extends string, V>(key: K, value: V | null | undefined): { [P in K]?: V } {
  if (value === null || value === undefined) {
    return {} as { [P in K]?: V };
  }
  return { [key]: value } as { [P in K]?: V };
}

/**
 * Metrik eşik değerleri (Web Vitals standartları)
 */
const METRIC_THRESHOLDS: Record<MetricType, { good: number; poor: number }> = {
  FCP: { good: 1800, poor: 3000 }, // ms
  LCP: { good: 2500, poor: 4000 }, // ms
  CLS: { good: 0.1, poor: 0.25 }, // skor
  FID: { good: 100, poor: 300 }, // ms
  INP: { good: 200, poor: 500 }, // ms
  TTFB: { good: 800, poor: 1800 }, // ms
};

/**
 * Metrik derecelendirmesini hesapla
 */
export function getMetricRating(
  name: MetricType,
  value: number,
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = METRIC_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Metrik rengini döndür
 */
export function getMetricColor(rating: 'good' | 'needs-improvement' | 'poor'): string {
  switch (rating) {
    case 'good':
      return '#22c55e'; // yeşil
    case 'needs-improvement':
      return '#f59e0b'; // turuncu
    case 'poor':
      return '#ef4444'; // kırmızı
  }
}

/**
 * Metrik birimini döndür
 */
export function getMetricUnit(name: MetricType): string {
  return name === 'CLS' ? '' : 'ms';
}

/**
 * Benzersiz ID üretir
 */
function generateId(): string {
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return `metric-${Date.now()}-${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Navigasyon zamanlamasını hesaplar
 */
export function getNavigationTiming(): NavigationTiming | null {
  if (typeof window === 'undefined') return null;

  const navEntries = performance.getEntriesByType('navigation');
  if (navEntries.length === 0) return null;

  const nav = navEntries[0] as PerformanceNavigationTiming;

  return {
    dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
    tcpConnection: nav.connectEnd - nav.connectStart,
    tlsNegotiation: nav.connectEnd - nav.secureConnectionStart,
    request: nav.responseStart - nav.requestStart,
    response: nav.responseEnd - nav.responseStart,
    domProcessing: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
    pageLoad: nav.loadEventEnd - nav.startTime,
    domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
    firstByte: nav.responseStart - nav.requestStart,
  };
}

/**
 * Kaynak zamanlamalarını toplar
 */
export function getResourceTiming(limit = 20): ResourceTimingSummary[] {
  if (typeof window === 'undefined') return [];

  const resourceEntries = performance.getEntriesByType('resource');

  return resourceEntries
    .slice(0, limit)
    .map((entry) => ({
      name: entry.name,
      duration: Math.round(entry.duration),
      transferSize: (entry as any).transferSize,
      initiatorType: (entry as PerformanceResourceTiming).initiatorType,
    }))
    .sort((a, b) => b.duration - a.duration);
}

/**
 * Bağlantı bilgilerini alır
 */
export function getConnectionInfo(): ConnectionInfo | undefined {
  if (typeof window === 'undefined') return undefined;

  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };

  if (!nav.connection) return undefined;

  return {
    ...withOptional('effectiveType', nav.connection.effectiveType),
    ...withOptional('downlink', nav.connection.downlink),
    ...withOptional('rtt', nav.connection.rtt),
    ...withOptional('saveData', nav.connection.saveData),
  };
}

/**
 * Performans raporunu oluşturur
 */
export function generatePerformanceReport(): PerformanceReport {
  return {
    metrics: {
      FCP: null,
      LCP: null,
      CLS: null,
      FID: null,
      INP: null,
      TTFB: null,
    },
    navigationTiming: getNavigationTiming(),
    resourceTiming: getResourceTiming(),
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    ...withOptional('connectionInfo', getConnectionInfo()),
  };
}

/**
 * Performans raporunu konsola yazdırır
 */
export function logPerformanceReport(report: PerformanceReport): void {
  const hasAnyMetrics = Object.values(report.metrics).some((m) => m !== null);

  if (!hasAnyMetrics && !report.navigationTiming) {
    return;
  }

  console.group('📊 Performans Raporu');

  // Web Vitals
  console.group('Web Vitals');
  Object.entries(report.metrics).forEach(([name, metric]) => {
    if (metric) {
      const color = getMetricColor(metric.rating);
      const unit = getMetricUnit(name as MetricType);
      logger.info(
        `%c${name}: ${metric.value.toFixed(name === 'CLS' ? 3 : 0)}${unit} (${metric.rating})`,
        `color: ${color}; font-weight: bold`,
      );
    }
  });
  console.groupEnd();

  // Navigasyon zamanlaması
  if (report.navigationTiming) {
    console.group('Navigasyon Zamanlaması');
    Object.entries(report.navigationTiming).forEach(([key, value]) => {
      logger.info(`${key}: ${Math.round(value)}ms`);
    });
    console.groupEnd();
  }

  // Bağlantı bilgisi
  if (report.connectionInfo) {
    console.group('Bağlantı Bilgisi');
    logger.info(`Tip: ${report.connectionInfo.effectiveType}`);
    logger.info(`Hız: ${report.connectionInfo.downlink} Mbps`);
    logger.info(`RTT: ${report.connectionInfo.rtt}ms`);
    logger.info(`Veri tasarrufu: ${report.connectionInfo.saveData ? 'Açık' : 'Kapalı'}`);
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Web Vitals metriklerini raporlar (Observer tabanlı)
 */
export function observeWebVitals(
  callback: (metric: Metric) => void,
): (() => void) | null {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return null;
  }

  const cleanupFunctions: (() => void)[] = [];

  // LCP - Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];

      const metric: Metric = {
        name: 'LCP',
        value: lastEntry.startTime,
        rating: getMetricRating('LCP', lastEntry.startTime),
        delta: lastEntry.startTime,
        entries,
        id: generateId(),
      };

      callback(metric);
    });

    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    cleanupFunctions.push(() => lcpObserver.disconnect());
  } catch {
    // LCP desteklenmiyor
  }

  // CLS - Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShiftEntry = entry as any;
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }

      const metric: Metric = {
        name: 'CLS',
        value: clsValue,
        rating: getMetricRating('CLS', clsValue),
        delta: clsValue,
        entries: entryList.getEntries(),
        id: generateId(),
      };

      callback(metric);
    });

    clsObserver.observe({ type: 'layout-shift', buffered: true });
    cleanupFunctions.push(() => clsObserver.disconnect());
  } catch {
    // CLS desteklenmiyor
  }

  // FID - First Input Delay
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const fidEntry = entries[0] as PerformanceEventTiming;
        const fidValue = fidEntry.processingStart - fidEntry.startTime;

        const metric: Metric = {
          name: 'FID',
          value: fidValue,
          rating: getMetricRating('FID', fidValue),
          delta: fidValue,
          entries,
          id: generateId(),
        };

        callback(metric);
      }
    });

    fidObserver.observe({ type: 'first-input', buffered: true });
    cleanupFunctions.push(() => fidObserver.disconnect());
  } catch {
    // FID desteklenmiyor
  }

  // INP - Interaction to Next Paint (FID yerine modern metrik)
  try {
    const inpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const inpEntry = entries[entries.length - 1] as PerformanceEventTiming;
        const inpValue = inpEntry.processingEnd - inpEntry.startTime;

        const metric: Metric = {
          name: 'INP',
          value: inpValue,
          rating: getMetricRating('INP', inpValue),
          delta: inpValue,
          entries,
          id: generateId(),
        };

        callback(metric);
      }
    });

    inpObserver.observe({ type: 'event', buffered: true });
    cleanupFunctions.push(() => inpObserver.disconnect());
  } catch {
    // INP desteklenmiyor
  }

  // TTFB - Time to First Byte (navigation timing'den)
  try {
    const navObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const navEntry = entries[0] as PerformanceNavigationTiming;
        const ttfbValue = navEntry.responseStart;

        const metric: Metric = {
          name: 'TTFB',
          value: ttfbValue,
          rating: getMetricRating('TTFB', ttfbValue),
          delta: ttfbValue,
          entries,
          id: generateId(),
        };

        callback(metric);
      }
    });

    navObserver.observe({ type: 'navigation', buffered: true });
    cleanupFunctions.push(() => navObserver.disconnect());
  } catch {
    // TTFB observer desteklenmiyor
  }

  // FCP - First Contentful Paint (navigation timing'den)
  try {
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const fcpEntry = entries[0];

        const metric: Metric = {
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: getMetricRating('FCP', fcpEntry.startTime),
          delta: fcpEntry.startTime,
          entries,
          id: generateId(),
        };

        callback(metric);
      }
    });

    fcpObserver.observe({ type: 'paint', buffered: true });
    cleanupFunctions.push(() => fcpObserver.disconnect());
  } catch {
    // FCP desteklenmiyor
  }

  // Cleanup fonksiyonu döndür
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
  };
}

/**
 * Sayfa yükleme süresini hesaplar
 */
export function getPageLoadTime(): number | null {
  if (typeof window === 'undefined') return null;

  const navEntries = performance.getEntriesByType('navigation');
  if (navEntries.length === 0) return null;

  const nav = navEntries[0] as PerformanceNavigationTiming;
  return nav.loadEventEnd - nav.startTime;
}

/**
 * Sayfa hazır olma süresini hesaplar (DOM Content Loaded)
 */
export function getDomReadyTime(): number | null {
  if (typeof window === 'undefined') return null;

  const navEntries = performance.getEntriesByType('navigation');
  if (navEntries.length === 0) return null;

  const nav = navEntries[0] as PerformanceNavigationTiming;
  return nav.domContentLoadedEventEnd - nav.startTime;
}

/**
 * Performans verilerini API'ye gönderir
 */
export async function sendPerformanceReport(
  report: PerformanceReport,
  endpoint = '/api/performance',
): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
      keepalive: true,
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Performans izlemeyi başlatır ve otomatik raporlama yapar
 */
export function initPerformanceTracking(
  options: {
    logToConsole?: boolean;
    sendToApi?: boolean;
    apiEndpoint?: string;
  } = {},
): (() => void) | null {
  if (typeof window === 'undefined') return null;

  const { logToConsole = true, sendToApi = false, apiEndpoint } = options;

  // Sayfa yükleme tamamlandığında rapor oluştur
  const reportOnLoad = () => {
    const report = generatePerformanceReport();

    if (logToConsole) {
      // Biraz bekle ki tüm metrikler toplansın
      setTimeout(() => {
        logPerformanceReport(report);
      }, 2000);
    }

    if (sendToApi && apiEndpoint) {
      sendPerformanceReport(report, apiEndpoint);
    }
  };

  if (document.readyState === 'complete') {
    reportOnLoad();
  } else {
    window.addEventListener('load', reportOnLoad);
  }

  // Web Vitals observer başlat
  const cleanupObserver = observeWebVitals((metric) => {
    if (logToConsole) {
      const unit = getMetricUnit(metric.name);
      logger.info(
        `[Performans] ${metric.name}: ${metric.value.toFixed(metric.name === 'CLS' ? 3 : 0)}${unit} (${metric.rating})`,
      );
    }
  });

  return () => {
    window.removeEventListener('load', reportOnLoad);
    cleanupObserver?.();
  };
}

