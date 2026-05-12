/**
 * Unit Tests — db wrapper (Drizzle-compatible execute facade)
 *
 * `db.execute(input)` accepts:
 * - Raw SQL string
 * - { sql: string, params: any[] } — Drizzle SQL object shape
 * - { toSQL(): { sql, params } } — Drizzle SQL builder shape
 * - Other inputs → coerced to string (best effort)
 *
 * normalizeSql is the parser; tests verify all 4 input shapes work without DB.
 */

import { describe, it, expect, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../postgres', () => ({
  query: queryMock,
}));

const { db } = await import('../db');

describe('db.execute — input normalization', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('handles raw SQL string with no params', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const result = await db.execute('SELECT 1');
    expect(queryMock).toHaveBeenCalledWith('SELECT 1', []);
    expect(result.rows).toEqual([{ id: 1 }]);
    expect(result.rowCount).toBe(1);
  });

  it('handles { sql, params } object shape (Drizzle SQL)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await db.execute({ sql: 'SELECT * FROM users WHERE id = $1', params: ['u1'] });
    expect(queryMock).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['u1']);
  });

  it('handles { toSQL } builder shape (Drizzle query builder)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const builder = {
      toSQL: () => ({ sql: 'SELECT 2', params: [42] }),
    };
    await db.execute(builder);
    expect(queryMock).toHaveBeenCalledWith('SELECT 2', [42]);
  });

  it('handles { sql } without params (defaults to [])', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await db.execute({ sql: 'SELECT 3' });
    expect(queryMock).toHaveBeenCalledWith('SELECT 3', []);
  });

  it('coerces null/undefined to empty SQL → empty result (skips DB)', async () => {
    const result = await db.execute(null);
    expect(queryMock).not.toHaveBeenCalled();
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it('coerces undefined input → skips DB call', async () => {
    const result = await db.execute(undefined);
    expect(queryMock).not.toHaveBeenCalled();
    expect(result.rows).toEqual([]);
  });

  it('coerces number input via String() (defensive)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await db.execute(42);
    expect(queryMock).toHaveBeenCalledWith('42', []);
  });

  it('returns empty when toSQL returns no sql', async () => {
    const result = await db.execute({ toSQL: () => ({ sql: '', params: [] }) });
    expect(queryMock).not.toHaveBeenCalled();
    expect(result.rows).toEqual([]);
  });

  it('handles toSQL returning malformed shape (params not array)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await db.execute({ toSQL: () => ({ sql: 'SELECT 1', params: null }) });
    // params normalized to []
    expect(queryMock).toHaveBeenCalledWith('SELECT 1', []);
  });

  it('passes through query result rows + rowCount', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ a: 1 }, { a: 2 }],
      rowCount: 2,
    });
    const result = await db.execute('SELECT * FROM x');
    expect(result.rows).toHaveLength(2);
    expect(result.rowCount).toBe(2);
  });

  it('handles params array empty', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await db.execute({ sql: 'SELECT 1', params: [] });
    expect(queryMock).toHaveBeenCalledWith('SELECT 1', []);
  });

  it('handles { sql } with non-array params (defensive)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await db.execute({ sql: 'SELECT 1', params: 'not-array' as any });
    expect(queryMock).toHaveBeenCalledWith('SELECT 1', []);
  });
});

// Re-import beforeEach (vi.mock above uses await import)
import { beforeEach } from 'vitest';
