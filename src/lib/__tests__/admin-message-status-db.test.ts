/**
 * Unit Tests - admin/message-status.ts
 *
 * - normalizeTicketStatus statusMap (legacy → canonical)
 * - updateAdminMessageStatus invalid status throw
 * - resolved_at conditional NOW (resolved/closed only)
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

beforeEach(() => {
  queryMock.mockReset();
});

import { normalizeTicketStatus, updateAdminMessageStatus } from '../admin/message-status';

describe('normalizeTicketStatus', () => {
  it('legacy → canonical', () => {
    expect(normalizeTicketStatus('new')).toBe('open');
    expect(normalizeTicketStatus('read')).toBe('in_progress');
    expect(normalizeTicketStatus('replied')).toBe('resolved');
    expect(normalizeTicketStatus('archived')).toBe('closed');
  });

  it('canonical passthrough', () => {
    expect(normalizeTicketStatus('open')).toBe('open');
    expect(normalizeTicketStatus('in_progress')).toBe('in_progress');
    expect(normalizeTicketStatus('resolved')).toBe('resolved');
    expect(normalizeTicketStatus('closed')).toBe('closed');
    expect(normalizeTicketStatus('spam')).toBe('spam');
  });

  it('unknown - null', () => {
    expect(normalizeTicketStatus('foo')).toBeNull();
    expect(normalizeTicketStatus('')).toBeNull();
    expect(normalizeTicketStatus('DELETE')).toBeNull();
  });
});

describe('updateAdminMessageStatus', () => {
  it('valid status - UPDATE + return canonical', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    const r = await updateAdminMessageStatus({ id: 't-1', status: 'replied', adminId: 'a-1' });
    expect(r.success).toBe(true);
    expect(r.status).toBe('resolved');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['resolved', 'a-1', 't-1']);
  });

  it('invalid status - throw', async () => {
    await expect(updateAdminMessageStatus({ id: 't-1', status: 'bogus' })).rejects.toThrow(/olmalıdır/);
  });

  it('adminId optional - null in SQL', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    await updateAdminMessageStatus({ id: 't-1', status: 'open' });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][1]).toBeNull();
  });

  it('SQL contains conditional resolved_at - resolved/closed only', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    await updateAdminMessageStatus({ id: 't-1', status: 'resolved' });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain("CASE WHEN $1 IN ('resolved', 'closed') THEN NOW() ELSE resolved_at END");
  });
});
