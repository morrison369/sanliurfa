import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  coalesceRequest,
  getCoalescingStats,
  decodeCursor,
  encodeCursor,
  buildCursorWhereClause,
  paginateWithCursor,
  selectCompression,
  getOptimalBatchSize
} from '../request-optimization';

describe('Phase 6: Request Optimization', () => {
  describe('Request Coalescing', () => {
    it('should coalesce duplicate concurrent requests', async () => {
      let executionCount = 0;

      const executor = async () => {
        executionCount++;
        return { data: 'test' };
      };

      const [result1, result2] = await Promise.all([
        coalesceRequest('test-endpoint', executor, { id: '1' }),
        coalesceRequest('test-endpoint', executor, { id: '1' })
      ]);

      expect(result1).toEqual(result2);
      expect(executionCount).toBe(1); // Only executed once
    });

    it('should track coalesced request statistics', async () => {
      const executor = async () => ({ data: 'test' });

      await Promise.all([
        coalesceRequest('endpoint1', executor),
        coalesceRequest('endpoint1', executor),
        coalesceRequest('endpoint2', executor)
      ]);

      const stats = getCoalescingStats();
      expect(stats.coalescedRequests).toBeGreaterThan(0);
    });
  });

  describe('Cursor-Based Pagination', () => {
    it('should decode valid cursors', () => {
      const data = { id: '123', created_at: '2026-04-08' };
      const encoded = encodeCursor(data, 'created_at');
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(expect.objectContaining({
        id: '123',
        created_at: '2026-04-08'
      }));
    });

    it('should handle invalid cursors gracefully', () => {
      const decoded = decodeCursor('invalid-base64!!!');
      expect(decoded).toBeNull();
    });

    it('should build correct cursor WHERE clause', () => {
      const cursor = { created_at: '2026-04-08', id: 'abc123' };
      const { whereClause, params } = buildCursorWhereClause(cursor, 'created_at', 'DESC');

      expect(whereClause).toContain('created_at');
      expect(whereClause).toContain('<');
      expect(params).toEqual(['2026-04-08', 'abc123']);
    });

    it('should paginate with cursor', async () => {
      const rows = [
        { id: '1', name: 'Item 1', created_at: '2026-04-08' },
        { id: '2', name: 'Item 2', created_at: '2026-04-07' },
        { id: '3', name: 'Item 3', created_at: '2026-04-06' }
      ];

      const result = await paginateWithCursor(
        'SELECT * FROM test',
        3,
        rows,
        { limit: 2, sortBy: 'created_at' }
      );

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('Compression Selection', () => {
    it('should prefer Brotli when available', () => {
      const encoding = selectCompression('gzip, br, deflate');
      expect(encoding).toBe('br');
    });

    it('should fallback to gzip', () => {
      const encoding = selectCompression('gzip, deflate');
      expect(encoding).toBe('gzip');
    });

    it('should return null when no compression available', () => {
      const encoding = selectCompression('identity');
      expect(encoding).toBeNull();
    });
  });

  describe('Batch Size Optimization', () => {
    it('should recommend small batch size for small data', () => {
      const size = getOptimalBatchSize(500 * 1024); // 500KB
      expect(size).toBe(100);
    });

    it('should recommend medium batch size for medium data', () => {
      const size = getOptimalBatchSize(5 * 1024 * 1024); // 5MB
      expect(size).toBe(500);
    });

    it('should recommend large batch size for large data', () => {
      const size = getOptimalBatchSize(50 * 1024 * 1024); // 50MB
      expect(size).toBe(1000);
    });
  });
});
