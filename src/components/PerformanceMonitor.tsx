/**
 * Performance Monitoring Component
 * Initializes client-side performance tracking
 */

import { useEffect } from 'react';

export default function PerformanceMonitor() {
  useEffect(() => {
    // Dinamically import performance monitor
    import('../lib/performance-monitor').then(({ initializePerformanceMonitoring }) => {
      initializePerformanceMonitoring();
    });
  }, []);

  return null;
}
