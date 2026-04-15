import { logger } from '../logging';
/**
 * Core Web Vitals Monitoring
 * LCP, FID, CLS, FCP, TTFB, INP tracking and reporting
 */

type WebVitalName = 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP';

interface WebVitalEntry {
  name: WebVitalName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  entries: PerformanceEntry[];
}

interface WebVitalThresholds {
  LCP: { good: number; poor: number };
  FID: { good: number; poor: number };
  CLS: { good: number; poor: number };
  FCP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
  INP: { good: number; poor: number };
}

const thresholds: WebVitalThresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

// Callbacks registry
const callbacks = new Map<WebVitalName, Set<(metric: WebVitalEntry) => void>>();

/**
 * Get rating based on value and thresholds
 */
function getRating(name: WebVitalName, value: number): WebVitalEntry['rating'] {
  const t = thresholds[name];
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report metric to all registered callbacks
 */
function reportMetric(metric: WebVitalEntry) {
  const cbs = callbacks.get(metric.name);
  if (cbs) {
    cbs.forEach(cb => {
      try {
        cb(metric);
      } catch (e) {
        logger.error('WebVital callback error:', e);
      }
    });
  }
}

/**
 * Observe LCP (Largest Contentful Paint)
 */
function observeLCP() {
  if (!('PerformanceObserver' in window)) return;

  let lcpValue = 0;
  let lcpEntries: PerformanceEntry[] = [];

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as any;
    lcpValue = lastEntry.startTime;
    lcpEntries = entries;
  });

  observer.observe({ entryTypes: ['largest-contentful-paint'] });

  // Report final LCP when page is hidden
  const reportLCP = () => {
    if (lcpValue > 0) {
      reportMetric({
        name: 'LCP',
        value: lcpValue,
        rating: getRating('LCP', lcpValue),
        entries: lcpEntries,
      });
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportLCP();
    }
  });

  // Also report on page unload
  window.addEventListener('pagehide', reportLCP);
}

/**
 * Observe FID (First Input Delay)
 */
function observeFID() {
  if (!('PerformanceObserver' in window)) return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as any;
      // Only count if it's a user input
      if (fidEntry.processingStart && fidEntry.startTime) {
        const value = fidEntry.processingStart - fidEntry.startTime;
        reportMetric({
          name: 'FID',
          value,
          rating: getRating('FID', value),
          entries: [entry],
        });
      }
    }
  });

  observer.observe({ entryTypes: ['first-input'] });
}

/**
 * Observe CLS (Cumulative Layout Shift)
 */
function observeCLS() {
  if (!('PerformanceObserver' in window)) return;

  let clsValue = 0;
  let clsEntries: PerformanceEntry[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const clsEntry = entry as any;
      // Only count if not caused by user input
      if (!clsEntry.hadRecentInput) {
        clsValue += clsEntry.value;
        clsEntries.push(entry);
      }
    }
  });

  observer.observe({ entryTypes: ['layout-shift'] });

  // Report final CLS when page is hidden
  const reportCLS = () => {
    reportMetric({
      name: 'CLS',
      value: clsValue,
      rating: getRating('CLS', clsValue),
      entries: clsEntries,
    });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportCLS();
    }
  });

  window.addEventListener('pagehide', reportCLS);
}

/**
 * Observe FCP (First Contentful Paint)
 */
function observeFCP() {
  if (!('PerformanceObserver' in window)) return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if ((entry as any).name === 'first-contentful-paint') {
        reportMetric({
          name: 'FCP',
          value: entry.startTime,
          rating: getRating('FCP', entry.startTime),
          entries: [entry],
        });
        observer.disconnect();
      }
    }
  });

  observer.observe({ entryTypes: ['paint'] });
}

/**
 * Observe TTFB (Time to First Byte)
 */
function observeTTFB() {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navEntry) {
    const value = navEntry.responseStart - navEntry.startTime;
    reportMetric({
      name: 'TTFB',
      value,
      rating: getRating('TTFB', value),
      entries: [navEntry],
    });
  }
}

/**
 * Observe INP (Interaction to Next Paint)
 */
function observeINP() {
  if (!('PerformanceObserver' in window)) return;

  // INP requires the web-vitals library for accurate measurement
  // This is a simplified version using Event Timing API
  const interactions: number[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const eventEntry = entry as any;
      if (eventEntry.interactionId && eventEntry.processingEnd) {
        const duration = eventEntry.processingEnd - eventEntry.startTime;
        interactions.push(duration);
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['event'] });
  } catch (e) {
    // Event Timing API not supported
    return;
  }

  // Report high percentile INP
  const reportINP = () => {
    if (interactions.length === 0) return;
    
    // Sort and get 98th percentile
    interactions.sort((a, b) => a - b);
    const inpIndex = Math.floor(interactions.length * 0.98);
    const inpValue = interactions[inpIndex];

    reportMetric({
      name: 'INP',
      value: inpValue,
      rating: getRating('INP', inpValue),
      entries: [],
    });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportINP();
    }
  });
}

/**
 * Initialize all Core Web Vitals observers
 */
export function initCoreWebVitals() {
  if (typeof window === 'undefined') return;

  observeLCP();
  observeFID();
  observeCLS();
  observeFCP();
  observeTTFB();
  observeINP();
}

/**
 * Register callback for specific web vital
 */
export function onWebVital(
  name: WebVitalName,
  callback: (metric: WebVitalEntry) => void
): () => void {
  if (!callbacks.has(name)) {
    callbacks.set(name, new Set());
  }
  
  callbacks.get(name)!.add(callback);

  return () => {
    callbacks.get(name)?.delete(callback);
  };
}

/**
 * Get all web vitals thresholds
 */
export function getWebVitalThresholds(): WebVitalThresholds {
  return { ...thresholds };
}

/**
 * Check if metric meets target
 */
export function meetsTarget(name: WebVitalName, value: number): boolean {
  return getRating(name, value) === 'good';
}

/**
 * Get web vitals summary
 */
export function getWebVitalsSummary(): {
  allMetrics: Partial<Record<WebVitalName, WebVitalEntry>>;
  overallScore: number;
} {
  // This would typically read from stored metrics
  // For now return empty
  return {
    allMetrics: {},
    overallScore: 0,
  };
}

/**
 * Send metrics to analytics endpoint
 */
export function sendToAnalytics(
  metric: WebVitalEntry,
  endpoint: string,
  extraData?: Record<string, any>
) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    page: window.location.pathname,
    timestamp: Date.now(),
    ...extraData,
  });

  // Use sendBeacon if available, otherwise fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
  } else {
    fetch(endpoint, {
      method: 'POST',
      body,
      keepalive: true,
    }).catch(() => {});
  }
}
