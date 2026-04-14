/**
 * Performance monitoring and analytics utilities
 */

// Core Web Vitals thresholds
export const VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },   // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint (ms)
};

// Performance entry types
interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
}

// Metric state
let metrics: PerformanceMetrics = {};

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Observe LCP
  observeLCP();

  // Observe FID
  observeFID();

  // Observe CLS
  observeCLS();

  // Observe FCP
  observeFCP();

  // Observe TTFB
  observeTTFB();

  // Observe INP (if supported)
  observeINP();

  // Send metrics after page load
  if (document.readyState === 'complete') {
    sendMetrics();
  } else {
    window.addEventListener('load', () => {
      setTimeout(sendMetrics, 100);
    });
  }
}

/**
 * Observe Largest Contentful Paint
 */
function observeLCP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      metrics.lcp = lastEntry.startTime;
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] as any });
  } catch (e) {
    // Browser doesn't support LCP
  }
}

/**
 * Observe First Input Delay
 */
function observeFID(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        const fidEntry = entry as PerformanceEntry & { processingStart: number; startTime: number };
        metrics.fid = fidEntry.processingStart - fidEntry.startTime;
      }
    });

    observer.observe({ entryTypes: ['first-input'] as any });
  } catch (e) {
    // Browser doesn't support FID
  }
}

/**
 * Observe Cumulative Layout Shift
 */
function observeCLS(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const clsEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      }
      metrics.cls = clsValue;
    });

    observer.observe({ entryTypes: ['layout-shift'] as any });
  } catch (e) {
    // Browser doesn't support CLS
  }
}

/**
 * Observe First Contentful Paint
 */
function observeFCP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          const fcpEntry = entry as PerformanceEntry & { startTime: number };
          metrics.fcp = fcpEntry.startTime;
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] as any });
  } catch (e) {
    // Browser doesn't support paint entries
  }
}

/**
 * Observe Time to First Byte
 */
function observeTTFB(): void {
  if (typeof window === 'undefined') return;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    metrics.ttfb = navigation.responseStart - navigation.startTime;
  }
}

/**
 * Observe Interaction to Next Paint
 */
function observeINP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    let maxDuration = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEntry & { duration: number };
        if (eventEntry.duration > maxDuration) {
          maxDuration = eventEntry.duration;
          metrics.inp = maxDuration;
        }
      }
    });

    observer.observe({ entryTypes: ['event'] as any });
  } catch (e) {
    // Browser doesn't support event entries
  }
}

/**
 * Get current metrics
 */
export function getMetrics(): PerformanceMetrics {
  return { ...metrics };
}

/**
 * Get metric rating (good, needs-improvement, poor)
 */
export function getMetricRating(
  metric: keyof typeof VITALS_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[metric];
  if (!thresholds) return 'poor';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metrics to analytics endpoint
 */
function sendMetrics(): void {
  if (typeof window === 'undefined') return;

  // Only send in production
  if (import.meta.env.DEV) return;

  // Prepare payload
  const payload = {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    metrics,
    ratings: {
      lcp: metrics.lcp ? getMetricRating('LCP', metrics.lcp) : undefined,
      fid: metrics.fid ? getMetricRating('FID', metrics.fid) : undefined,
      cls: metrics.cls ? getMetricRating('CLS', metrics.cls) : undefined,
      fcp: metrics.fcp ? getMetricRating('FCP', metrics.fcp) : undefined,
      ttfb: metrics.ttfb ? getMetricRating('TTFB', metrics.ttfb) : undefined,
      inp: metrics.inp ? getMetricRating('INP', metrics.inp) : undefined,
    },
  };

  // Send via beacon if available
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/performance', JSON.stringify(payload));
  } else {
    // Fallback to fetch
    fetch('/api/analytics/performance', {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silently fail
    });
  }
}

/**
 * Track custom event timing
 */
export function trackTiming(eventName: string, duration: number): void {
  if (typeof window === 'undefined') return;

  const payload = {
    type: 'timing',
    event: eventName,
    duration,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/events', JSON.stringify(payload));
  }
}

/**
 * Track user interaction
 */
export function trackInteraction(action: string, metadata?: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  const payload = {
    type: 'interaction',
    action,
    metadata,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/events', JSON.stringify(payload));
  }
}

/**
 * Debounce function for scroll/resize handlers
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for scroll/resize handlers
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  if (as === 'font') {
    link.crossOrigin = 'anonymous';
  }

  document.head.appendChild(link);
}

/**
 * Prefetch route for faster navigation
 */
export function prefetchRoute(href: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}
