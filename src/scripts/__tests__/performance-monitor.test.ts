import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/performance-monitor', () => ({
  initializePerformanceMonitoring: vi.fn(),
}));

describe('performance monitor script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('initializes performance monitoring once', async () => {
    const root = {
      dataset: {},
    };

    (globalThis as any).document = {
      querySelector: () => root,
    };

    const { initPerformanceMonitor } = await import('../performance-monitor');
    const { initializePerformanceMonitoring } = await import('../../lib/performance-monitor');

    initPerformanceMonitor();
    initPerformanceMonitor();

    expect(initializePerformanceMonitoring).toHaveBeenCalledTimes(1);
    expect(root.dataset.initialized).toBe('true');
  });
});
