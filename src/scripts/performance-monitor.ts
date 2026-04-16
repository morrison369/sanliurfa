import { initializePerformanceMonitoring } from '../lib/performance-monitor';

type PerformanceMonitorRoot = HTMLElement & {
  dataset: DOMStringMap;
};

export function initPerformanceMonitor() {
  const root = document.querySelector<PerformanceMonitorRoot>('[data-performance-monitor]');
  if (!root || root.dataset.initialized === 'true') {
    return;
  }

  root.dataset.initialized = 'true';
  initializePerformanceMonitoring();
}
