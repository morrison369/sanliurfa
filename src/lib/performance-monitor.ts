/**
 * Performance Monitoring & Optimization
 * Client-side performance tracking, metrics collection, and optimization suggestions
 */

interface PerformanceMetrics {
  navigationStart: number;
  responseEnd: number;
  domInteractive: number;
  domComplete: number;
  loadEventEnd: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  dcl?: number;
  fid?: number;
  cls?: number;
}

/**
 * Collect Core Web Vitals and performance metrics
 */
export function collectPerformanceMetrics(): PerformanceMetrics {
  const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paintEntries = performance.getEntriesByType('paint');

  const metrics: PerformanceMetrics = {
    navigationStart: navTiming?.navigationStart || 0,
    responseEnd: navTiming?.responseEnd || 0,
    domInteractive: navTiming?.domInteractive || 0,
    domComplete: navTiming?.domComplete || 0,
    loadEventEnd: navTiming?.loadEventEnd || 0,
  };

  paintEntries.forEach((entry) => {
    if (entry.name === 'first-contentful-paint') {
      metrics.firstContentfulPaint = entry.startTime;
      metrics.fcp = entry.startTime;
    }
  });

  if (navTiming) {
    metrics.ttfb = navTiming.responseStart - navTiming.navigationStart;
    metrics.dcl = navTiming.domContentLoadedEventEnd - navTiming.navigationStart;
  }

  return metrics;
}

/**
 * Get resource timing information
 */
export function getResourceMetrics() {
  return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
}

/**
 * Identify slow resources (threshold in ms)
 */
export function getSlowResources(threshold: number = 1000): PerformanceResourceTiming[] {
  return getResourceMetrics().filter((resource) => resource.duration > threshold);
}

/**
 * Send performance metrics to analytics endpoint
 */
export async function sendPerformanceMetrics(metrics: PerformanceMetrics): Promise<boolean> {
  try {
    const response = await fetch('/api/metrics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: Date.now(),
        metrics,
        url: window.location.href,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType || 'unknown'
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send performance metrics:', error);
    return false;
  }
}

/**
 * Web Vitals thresholds
 */
const THRESHOLDS = {
  lcp: 2500,
  fid: 100,
  cls: 0.1
};

/**
 * Check if page meets Core Web Vitals thresholds
 */
export function meetsWebVitalsThresholds(metrics: Partial<PerformanceMetrics>) {
  return {
    lcp: (metrics.lcp || 0) <= THRESHOLDS.lcp,
    fid: (metrics.fid || 0) <= THRESHOLDS.fid,
    cls: (metrics.cls || 0) <= THRESHOLDS.cls
  };
}

/**
 * Get optimization recommendations
 */
export function getOptimizationRecommendations(metrics: PerformanceMetrics): string[] {
  const recommendations: string[] = [];

  if ((metrics.lcp || 0) > THRESHOLDS.lcp) {
    recommendations.push('LCP Optimizasyonu: Büyük resimler için lazy loading kullanın');
  }

  if ((metrics.fid || 0) > THRESHOLDS.fid) {
    recommendations.push('FID Optimizasyonu: JavaScript işleme süresini azaltın');
  }

  if ((metrics.cls || 0) > THRESHOLDS.cls) {
    recommendations.push('CLS Optimizasyonu: Medya boyutlarını açıkça belirtin');
  }

  const slowResources = getSlowResources();
  if (slowResources.length > 0) {
    recommendations.push(`${slowResources.length} yavaş kaynak bulundu`);
  }

  if ((metrics.ttfb || 0) > 600) {
    recommendations.push('TTFB: Sunucu yanıt süresini iyileştirin');
  }

  return recommendations;
}

/**
 * Initialize performance monitoring on page load
 */
export function initializePerformanceMonitoring(): void {
  if (!('performance' in window)) return;

  window.addEventListener('load', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const metrics = collectPerformanceMetrics();
    await sendPerformanceMetrics(metrics);
  });
}
