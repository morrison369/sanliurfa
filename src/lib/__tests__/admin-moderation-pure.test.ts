/**
 * Unit Tests - admin/admin-moderation.ts vi.mock postgres
 *
 * - getModerationQueue (default status pending + ORDER BY priority DESC, created_at ASC + LEFT JOIN users)
 * - default limit 20 + offset 0
 * - status filter parameterization
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryManyMock } = vi.hoisted(() => ({
  queryManyMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: vi.fn(),
  queryMany: queryManyMock,
  insert: vi.fn(),
  update: vi.fn(),
}));

beforeEach(() => {
  queryManyMock.mockReset();
});

import { getModerationQueue } from '../admin/admin-moderation';

describe('getModerationQueue', () => {
  it('default status "pending" + limit 20 + offset 0', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getModerationQueue();
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['pending', 20, 0]);
  });

  it('custom status "in_review"', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getModerationQueue('in_review');
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[1][0]).toBe('in_review');
  });

  it('ORDER BY priority DESC, created_at ASC (high priority first)', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getModerationQueue('pending');
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[0]).toContain('ORDER BY mq.priority DESC, mq.created_at ASC');
  });

  it('LEFT JOIN users for assigned_admin_email', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getModerationQueue();
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[0]).toContain('LEFT JOIN users u ON mq.assigned_to_admin_id = u.id');
  });

  it('returns ModerationQueueItem array', async () => {
    queryManyMock.mockResolvedValueOnce([
      {
        id: 'mq-1',
        queue_type: 'flag',
        item_type: 'review',
        item_id: 'r-1',
        priority: 5,
        status: 'pending',
        created_at: 't',
      },
    ]);
    const r = await getModerationQueue();
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('mq-1');
  });

  it('exception - empty array fallback', async () => {
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getModerationQueue()).toEqual([]);
  });

  it('custom limit + offset (pagination)', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getModerationQueue('pending', 50, 100);
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['pending', 50, 100]);
  });
});
