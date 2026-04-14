// @ts-nocheck
/**
 * Real User Monitoring (RUM)
 * Performance metrics collection from actual users
 */

import { logger } from '../logger';

export interface PerformanceMetrics {
  // Navigation Timing
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  tti: number; // Time to Interactive
  
  // Resource Timing
  domLoad: number;
  windowLoad: number;
  
  // Custom
  apiLatency: number;
  jsBundleSize: number;
  
  // Metadata
  url: string;
  userAgent: string;
  connectionType: string;
  deviceMemory?: number;
  deviceCores?: number;
}

class RealUserMonitoring {
  private isEnabled: boolean;
  private buffer: PerformanceMetrics[] = [];
  private flushInterval = 30000; // 30 seconds
  private endpoint = '/api/metrics/rum';

  constructor() {
    this.isEnabled = typeof window !== 'undefined' && 'performance' in window;
    
    if (this.isEnabled) {
      this.init();
    }
  }

  private init(): void {
    // Collect Core Web Vitals
    this.observeWebVitals();
    
    // Collect navigation timing
    this.collectNavigationTiming();
    
    // Setup periodic flush
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }

  /**
   * Observe Core Web Vitals
   */
  private observeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry;
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch {
        // Browser doesn't support LCP
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as PerformanceEventTiming;
            this.metrics.fid = fidEntry.processingStart - fidEntry.startTime;
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch {
        // Browser doesn't support FID
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as LayoutShift;
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value;
            }
          }
          this.metrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch {
        // Browser doesn't support CLS
      }
    }

    // First Contentful Paint (FCP)
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(
            (entry) => entry.name === 'first-contentful-paint'
          );
          if (fcpEntry) {
            this.metrics.fcp = fcpEntry.startTime;
          }
          
          this.collectAndSend();
        }, 0);
      });
    }
  }

  /**
   * Collect navigation timing
   */
  private collectNavigationTiming(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navEntry) {
          this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
          this.metrics.domLoad = navEntry.domComplete - navEntry.domLoading;
          this.metrics.windowLoad = navEntry.loadEventEnd - navEntry.loadEventStart;
          
          // Estimate TTI
          this.metrics.tti = navEntry.domInteractive - navEntry.startTime;
        }
      }, 0);
    });
  }

  private metrics: Partial<PerformanceMetrics> = {};

  /**
   * Collect and send metrics
   */
  private collectAndSend(): void {
    if (typeof window === 'undefined') return;

    const metrics: PerformanceMetrics = {
      ttfb: this.metrics.ttfb || 0,
      fcp: this.metrics.fcp || 0,
      lcp: this.metrics.lcp || 0,
      fid: this.metrics.fid || 0,
      cls: this.metrics.cls || 0,
      tti: this.metrics.tti || 0,
      domLoad: this.metrics.domLoad || 0,
      windowLoad: this.metrics.windowLoad || 0,
      apiLatency: 0,
      jsBundleSize: this.getJsBundleSize(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      deviceMemory: (navigator as any).deviceMemory,
      deviceCores: navigator.hardwareConcurrency,
    };

    this.buffer.push(metrics);
  }

  /**
   * Get JavaScript bundle size
   */
  private getJsBundleSize(): number {
    if (typeof performance === 'undefined') return 0;
    
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;
    
    for (const resource of resources) {
      if (resource.name.endsWith('.js')) {
        totalSize += (resource as PerformanceResourceTiming).encodedBodySize || 0;
      }
    }
    
    return totalSize;
  }

  /**
   * Flush metrics to server
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const metrics = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
        keepalive: true,
      });
    } catch (error) {
      // Put metrics back in buffer
      this.buffer.unshift(...metrics);
      logger.error('Failed to send RUM metrics', error);
    }
  }

  /**
   * Track API latency
   */
  trackApiLatency(duration: number, endpoint: string): void {
    this.metrics.apiLatency = duration;
    
    // Send immediately for API calls
    if (typeof window !== 'undefined') {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'api_latency',
          duration,
          endpoint,
          timestamp: Date.now(),
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  /**
   * Track custom metric
   */
  trackCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (typeof window !== 'undefined') {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          name,
          value,
          tags,
          timestamp: Date.now(),
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }
}

// Singleton instance
export const rum = new RealUserMonitoring();

export default rum;

