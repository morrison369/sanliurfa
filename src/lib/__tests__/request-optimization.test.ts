/**
 * Unit Tests — request-optimization.ts
 *
 * Phase 6 application-level optimization helpers:
 * - coalesceRequest: dedupe concurrent same-key requests within 5s TTL
 * - getCoalescingStats: pending request snapshot
 * - encodeCursor / decodeCursor: base64 + JSON cursor pagination
 * - buildCursorWhereClause: keyset pagination SQL builder
 * - paginateWithCursor: list slicer + nextCursor generator
 * - selectCompression: Accept-Encoding header → br/gzip/deflate priority
 * - getOptimalBatchSize: data size → streaming batch size
 * - calculateCompressionStats: ratio % calculator
 */

import { describe, it, expect } from 'vitest';
import {
  coalesceRequest,
  getCoalescingStats,
  decodeCursor,
  encodeCursor,
  buildCursorWhereClause,
  paginateWithCursor,
  selectCompression,
  getOptimalBatchSize,
  calculateCompressionStats,
} from '../request-optimization';

describe('coalesceRequest', () => {
  it('aynı key concurrent çağrı → executor 1 kez çalışır', async () => {
    let calls = 0;
    const exec = async () => {
      calls++;
      return 'result';
    };
    const [r1, r2, r3] = await Promise.all([
      coalesceRequest('key-coalesce-1', exec),
      coalesceRequest('key-coalesce-1', exec),
      coalesceRequest('key-coalesce-1', exec),
    ]);
    expect(r1).toBe('result');
    expect(r2).toBe('result');
    expect(r3).toBe('result');
    expect(calls).toBe(1);
  });

  it('farklı key → executor her biri için çalışır', async () => {
    let calls = 0;
    const exec = async () => {
      calls++;
      return calls;
    };
    await Promise.all([
      coalesceRequest('key-diff-A', exec),
      coalesceRequest('key-diff-B', exec),
      coalesceRequest('key-diff-C', exec),
    ]);
    expect(calls).toBe(3);
  });

  it('params değişirse farklı cache key oluşur', async () => {
    let calls = 0;
    const exec = async () => {
      calls++;
      return calls;
    };
    await Promise.all([
      coalesceRequest('endpoint', exec, { id: 1 }),
      coalesceRequest('endpoint', exec, { id: 2 }),
    ]);
    expect(calls).toBe(2);
  });

  it('aynı params → coalesce', async () => {
    let calls = 0;
    const exec = async () => {
      calls++;
      return calls;
    };
    await Promise.all([
      coalesceRequest('endpoint-same', exec, { id: 1 }),
      coalesceRequest('endpoint-same', exec, { id: 1 }),
      coalesceRequest('endpoint-same', exec, { id: 1 }),
    ]);
    expect(calls).toBe(1);
  });

  it('executor reject → cache temizlenir, sonraki çağrı yeniden çalışır', async () => {
    let calls = 0;
    const exec = async () => {
      calls++;
      throw new Error('fail');
    };
    await expect(coalesceRequest('key-error-1', exec)).rejects.toThrow('fail');
    // Bekleme yok — promise zaten reject oldu, cache temizlendi.
    await expect(coalesceRequest('key-error-1', exec)).rejects.toThrow('fail');
    expect(calls).toBe(2);
  });

  it('executor resolve sonrası cache temizlenir', async () => {
    let calls = 0;
    const exec = async () => {
      calls++;
      return 'ok';
    };
    await coalesceRequest('key-cleanup-1', exec);
    // Yeni çağrı (önceki tamamlandı, cache temiz)
    await coalesceRequest('key-cleanup-1', exec);
    expect(calls).toBe(2);
  });
});

describe('getCoalescingStats', () => {
  it('snapshot döner — totalPending + coalescedRequests sayaçları', () => {
    const stats = getCoalescingStats();
    expect(stats).toHaveProperty('totalPending');
    expect(stats).toHaveProperty('coalescedRequests');
    expect(stats).toHaveProperty('details');
    expect(Array.isArray(stats.details)).toBe(true);
  });

  it('coalescedRequests sayacı monotonic artar', async () => {
    const before = getCoalescingStats().coalescedRequests;
    await Promise.all([
      coalesceRequest('stats-1', async () => 1),
      coalesceRequest('stats-1', async () => 1),
      coalesceRequest('stats-1', async () => 1),
    ]);
    const after = getCoalescingStats().coalescedRequests;
    expect(after).toBeGreaterThanOrEqual(before + 2); // 2 coalesce ek
  });
});

describe('encodeCursor + decodeCursor', () => {
  it('roundtrip — encode + decode aynı objeyi döner', () => {
    const row = { id: 'abc-123', created_at: '2026-05-04T12:00:00Z' };
    const cursor = encodeCursor(row, 'created_at');
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual({ created_at: '2026-05-04T12:00:00Z', id: 'abc-123' });
  });

  it('encode base64 string döner', () => {
    const row = { id: '1', created_at: '2026-01-01' };
    const cursor = encodeCursor(row, 'created_at');
    // base64 alphabet: A-Za-z0-9+/=
    expect(cursor).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('decode boş string → null', () => {
    expect(decodeCursor('')).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('decode invalid base64 → null (try/catch)', () => {
    expect(decodeCursor('!!!INVALID!!!')).toBeNull();
  });

  it('decode invalid JSON → null', () => {
    const notJson = Buffer.from('not json').toString('base64');
    expect(decodeCursor(notJson)).toBeNull();
  });

  it('encode farklı sortBy farklı cursor üretir', () => {
    const row = { id: '1', created_at: '2026-01-01', name: 'X' };
    const c1 = encodeCursor(row, 'created_at');
    const c2 = encodeCursor(row, 'name');
    expect(c1).not.toBe(c2);
  });
});

describe('buildCursorWhereClause', () => {
  it('cursor null → boş whereClause + boş params', () => {
    const result = buildCursorWhereClause(null);
    expect(result.whereClause).toBe('');
    expect(result.params).toEqual([]);
  });

  it('cursor + DESC default → "<" operator', () => {
    const cursor = { created_at: '2026-01-01', id: 'abc' };
    const result = buildCursorWhereClause(cursor);
    expect(result.whereClause).toContain('<');
    expect(result.whereClause).toContain('(created_at, id)');
    expect(result.params).toEqual(['2026-01-01', 'abc']);
  });

  it('ASC order → ">" operator', () => {
    const cursor = { id: 'abc', created_at: '2026-01-01' };
    const result = buildCursorWhereClause(cursor, 'created_at', 'ASC');
    expect(result.whereClause).toContain('>');
  });

  it('custom sortBy', () => {
    const cursor = { id: 'abc', name: 'Mekan' };
    const result = buildCursorWhereClause(cursor, 'name');
    expect(result.whereClause).toContain('(name, id)');
    expect(result.params[0]).toBe('Mekan');
  });

  it('placeholder $1 $2 binding sırası', () => {
    const cursor = { created_at: 'X', id: 'Y' };
    const result = buildCursorWhereClause(cursor);
    expect(result.whereClause).toContain('$1');
    expect(result.whereClause).toContain('$2');
  });
});

describe('paginateWithCursor', () => {
  it('rows.length <= limit → hasMore false, nextCursor yok', async () => {
    const rows = [
      { id: '1', created_at: '2026-01-01' },
      { id: '2', created_at: '2026-01-02' },
    ];
    const result = await paginateWithCursor('SQL', 0, rows, { limit: 5 });
    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it('rows.length > limit → hasMore true + nextCursor üretilir', async () => {
    const rows = [
      { id: '1', created_at: '2026-01-01' },
      { id: '2', created_at: '2026-01-02' },
      { id: '3', created_at: '2026-01-03' }, // extra row → hasMore signal
    ];
    const result = await paginateWithCursor('SQL', 0, rows, { limit: 2 });
    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeDefined();
  });

  it('nextCursor decode edilebilir → son data row\'unun cursor değerleri', async () => {
    const rows = [
      { id: '1', created_at: '2026-01-01' },
      { id: '2', created_at: '2026-01-02' },
      { id: '3', created_at: '2026-01-03' },
    ];
    const result = await paginateWithCursor('SQL', 0, rows, { limit: 2 });
    const decoded = decodeCursor(result.nextCursor);
    expect(decoded?.id).toBe('2'); // 2nd row (limit'e kadar)
    expect(decoded?.created_at).toBe('2026-01-02');
  });

  it('boş rows → boş data, hasMore false', async () => {
    const result = await paginateWithCursor('SQL', 0, [], { limit: 10 });
    expect(result.data).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it('limit field response\'da geri döner', async () => {
    const result = await paginateWithCursor('SQL', 0, [], { limit: 25 });
    expect(result.limit).toBe(25);
  });
});

describe('selectCompression', () => {
  it('Brotli en yüksek öncelik (varsa)', () => {
    expect(selectCompression('br, gzip, deflate')).toBe('br');
    expect(selectCompression('gzip, br')).toBe('br');
  });

  it('Brotli yok → gzip', () => {
    expect(selectCompression('gzip, deflate')).toBe('gzip');
  });

  it('gzip + br yok → deflate', () => {
    expect(selectCompression('deflate')).toBe('deflate');
  });

  it('hiçbiri yok → null', () => {
    expect(selectCompression('identity')).toBeNull();
  });

  it('boş header → null', () => {
    expect(selectCompression('')).toBeNull();
  });
});

describe('getOptimalBatchSize', () => {
  it('< 1MB → batch 100', () => {
    expect(getOptimalBatchSize(500 * 1024)).toBe(100);
  });

  it('1MB boundary tam → 500 (>= 1MB)', () => {
    expect(getOptimalBatchSize(1024 * 1024)).toBe(500);
  });

  it('1-10MB → batch 500', () => {
    expect(getOptimalBatchSize(5 * 1024 * 1024)).toBe(500);
  });

  it('10MB boundary tam → 1000', () => {
    expect(getOptimalBatchSize(10 * 1024 * 1024)).toBe(1000);
  });

  it('> 10MB → batch 1000', () => {
    expect(getOptimalBatchSize(50 * 1024 * 1024)).toBe(1000);
  });

  it('0 byte → 100 (en küçük batch)', () => {
    expect(getOptimalBatchSize(0)).toBe(100);
  });
});

describe('calculateCompressionStats', () => {
  it('basic — 1000 → 500 → ratio %50', () => {
    const stats = calculateCompressionStats(1000, 500, 'gzip');
    expect(stats.original).toBe(1000);
    expect(stats.compressed).toBe(500);
    expect(stats.ratio).toBe(50);
    expect(stats.algorithm).toBe('gzip');
  });

  it('100 → 25 → ratio %25', () => {
    expect(calculateCompressionStats(100, 25, 'br').ratio).toBe(25);
  });

  it('ratio 2 ondalık (toFixed(2))', () => {
    const stats = calculateCompressionStats(1000, 333, 'br');
    // 333/1000*100 = 33.3 → "33.30" → 33.3
    expect(stats.ratio).toBeCloseTo(33.3, 1);
  });

  it('algorithm field passthrough', () => {
    const stats = calculateCompressionStats(100, 50, 'custom-algo');
    expect(stats.algorithm).toBe('custom-algo');
  });
});
