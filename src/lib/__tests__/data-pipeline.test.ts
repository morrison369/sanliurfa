/**
 * Unit Tests — data/data-pipeline.ts class managers
 *
 * - Pipeline (ETL: extract → transform → load + error aggregation per phase)
 * - PipelineRegistry (register/get/list/execute by id)
 * - PipelineMonitor (recordRun + getHistory + getHealthStatus 80/50% threshold + getStats)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Pipeline, PipelineRegistry, PipelineMonitor } from '../data/data-pipeline';

describe('Pipeline ETL', () => {
  it('execute — sadece extract phase (boş transform/load) → recordsExtracted set', async () => {
    const p = new Pipeline('p-1', 'Test Pipeline');
    p.addExtractor({ name: 'e1', extract: async () => [{ id: 1 }, { id: 2 }] } as any);
    const result = await p.execute();
    expect(result.success).toBe(true);
    expect(result.recordsExtracted).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it('execute — full ETL: 3-stage', async () => {
    const p = new Pipeline('p-2', 'Full');
    p.addExtractor({ name: 'e', extract: async () => [{ x: 1 }, { x: 2 }] } as any);
    p.addTransformer({ name: 't', transform: async (data: any[]) => data.map((d) => ({ ...d, y: d.x * 2 })) } as any);
    p.addLoader({ name: 'l', load: async (data: any[]) => data.length } as any);
    const result = await p.execute();
    expect(result.success).toBe(true);
    expect(result.recordsExtracted).toBe(2);
    expect(result.recordsTransformed).toBe(2);
    expect(result.recordsLoaded).toBe(2);
  });

  it('execute — extractor throws → errors aggregated, success:false', async () => {
    const p = new Pipeline('p-err', 'Err');
    p.addExtractor({ name: 'failing', extract: async () => { throw new Error('extract fail'); } } as any);
    const result = await p.execute();
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('failing');
  });

  it('execute — fluent chain (this return)', async () => {
    const p = new Pipeline('p-fluent', 'Fluent');
    const ret = p.addExtractor({ name: 'e', extract: async () => [] } as any)
      .addTransformer({ name: 't', transform: async (d: any) => d } as any)
      .addLoader({ name: 'l', load: async () => 0 } as any);
    expect(ret).toBe(p);
  });

  it('execute — duration measure (>= 0)', async () => {
    const p = new Pipeline('p-dur', 'D');
    p.addExtractor({ name: 'e', extract: async () => [] } as any);
    const result = await p.execute();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('PipelineRegistry', () => {
  let registry: PipelineRegistry;
  beforeEach(() => { registry = new PipelineRegistry(); });

  it('register + get — pipeline okunur', () => {
    const p = new Pipeline('reg-1', 'X');
    registry.register(p);
    expect(registry.get('reg-1')).toBe(p);
  });

  it('get — bilinmeyen → null', () => {
    expect(registry.get('non-existent')).toBeNull();
  });

  it('list — id+name pairs', () => {
    registry.register(new Pipeline('a', 'A'));
    registry.register(new Pipeline('b', 'B'));
    const list = registry.list();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ id: 'a', name: 'A' });
  });

  it('execute — bilinmeyen pipelineId → success:false + error', async () => {
    const result = await registry.execute('non-existent');
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });

  it('execute — kayıtlı pipeline çalıştır', async () => {
    const p = new Pipeline('exec-test', 'E');
    p.addExtractor({ name: 'x', extract: async () => [{ id: 1 }] } as any);
    registry.register(p);
    const result = await registry.execute('exec-test');
    expect(result.success).toBe(true);
    expect(result.recordsExtracted).toBe(1);
  });
});

describe('PipelineMonitor', () => {
  let monitor: PipelineMonitor;
  beforeEach(() => { monitor = new PipelineMonitor(); });

  it('recordRun + getHistory — pipeline run geçmişi', () => {
    monitor.recordRun('p-1', { success: true, recordsExtracted: 0, recordsTransformed: 0, recordsLoaded: 0, duration: 100, errors: [] });
    expect(monitor.getHistory('p-1')).toHaveLength(1);
  });

  it('getHistory — pipelineId filter + reverse (en yeni ilk)', () => {
    monitor.recordRun('p-h', { success: true, recordsExtracted: 1, recordsTransformed: 1, recordsLoaded: 1, duration: 1, errors: [] });
    monitor.recordRun('p-other', { success: true, recordsExtracted: 0, recordsTransformed: 0, recordsLoaded: 0, duration: 1, errors: [] });
    const history = monitor.getHistory('p-h');
    expect(history).toHaveLength(1);
    expect(history[0].pipelineId).toBe('p-h');
  });

  it('getHealthStatus — boş history → "healthy" default', () => {
    expect(monitor.getHealthStatus('non-existent')).toBe('healthy');
  });

  it('getHealthStatus — successRate >= 80% → "healthy"', () => {
    for (let i = 0; i < 10; i++) {
      monitor.recordRun('p-healthy', { success: i < 9, recordsExtracted: 0, recordsTransformed: 0, recordsLoaded: 0, duration: 1, errors: [] });
    }
    expect(monitor.getHealthStatus('p-healthy')).toBe('healthy');
  });

  it('getHealthStatus — 50% <= successRate < 80% → "degraded"', () => {
    for (let i = 0; i < 10; i++) {
      monitor.recordRun('p-degr', { success: i < 6, recordsExtracted: 0, recordsTransformed: 0, recordsLoaded: 0, duration: 1, errors: [] });
    }
    expect(monitor.getHealthStatus('p-degr')).toBe('degraded');
  });

  it('getHealthStatus — successRate < 50% → "failed"', () => {
    for (let i = 0; i < 10; i++) {
      monitor.recordRun('p-fail', { success: i < 3, recordsExtracted: 0, recordsTransformed: 0, recordsLoaded: 0, duration: 1, errors: [] });
    }
    expect(monitor.getHealthStatus('p-fail')).toBe('failed');
  });

  it('getStats — totalRuns + successRate + avgDuration', () => {
    monitor.recordRun('s-1', { success: true, recordsExtracted: 0, recordsTransformed: 0, recordsLoaded: 0, duration: 100, errors: [] });
    monitor.recordRun('s-1', { success: false, recordsExtracted: 0, recordsTransformed: 0, recordsLoaded: 0, duration: 200, errors: ['x'] });
    const stats = monitor.getStats();
    expect(stats.totalRuns).toBe(2);
    expect(stats.successRate).toBe(50);
    expect(stats.avgDuration).toBe(150);
  });

  it('getStats — boş history → 0/0/0', () => {
    expect(monitor.getStats()).toEqual({ totalRuns: 0, successRate: 0, avgDuration: 0 });
  });
});
