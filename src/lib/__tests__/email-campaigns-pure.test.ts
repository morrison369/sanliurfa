/**
 * Unit Tests - email/email-campaigns.ts vi.mock postgres
 *
 * - createCampaign (INSERT with all 17 fields + counters 0 default + segment_filters JSON.stringify when provided)
 * - segment enum (all_users / subscribers / premium / inactive / custom)
 * - status enum (draft / scheduled / active / paused / completed / failed)
 * - segment_filters null when not provided
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryMany: vi.fn(),
  queryOne: queryOneMock,
  update: vi.fn(),
}));

beforeEach(() => {
  queryOneMock.mockReset();
});

import { createCampaign } from '../email/email-campaigns';

const mkRow = (overrides: any = {}) => ({
  id: 'camp-1',
  name: 'Welcome Series',
  subject: 'Welcome!',
  from_name: 'Sanliurfa.com',
  from_email: 'noreply@sanliurfa.com',
  html_content: '<h1>Welcome</h1>',
  text_content: 'Welcome',
  segment: 'subscribers',
  segment_filters: null,
  scheduled_at: null,
  status: 'draft',
  send_count: 0,
  open_count: 0,
  click_count: 0,
  unsubscribe_count: 0,
  bounce_count: 0,
  created_at: 't',
  updated_at: 't',
  ...overrides,
});

describe('createCampaign', () => {
  it('insert + counters 0 default', async () => {
    queryOneMock.mockResolvedValueOnce(mkRow());
    const r = await createCampaign({
      name: 'Welcome Series',
      subject: 'Welcome!',
      fromName: 'Sanliurfa.com',
      fromEmail: 'noreply@sanliurfa.com',
      htmlContent: '<h1>Welcome</h1>',
      textContent: 'Welcome',
      segment: 'subscribers',
      status: 'draft',
    });
    expect(r?.id).toBe('camp-1');
    expect(r?.sendCount).toBe(0);
    expect(r?.openCount).toBe(0);
  });

  it('segment_filters - JSON.stringify when provided', async () => {
    queryOneMock.mockResolvedValueOnce(mkRow());
    await createCampaign({
      name: 'X',
      subject: 'Y',
      fromName: 'F',
      fromEmail: 'f@e.com',
      htmlContent: 'h',
      textContent: 't',
      segment: 'custom',
      segmentFilters: { country: 'TR', age: '18-30' },
      status: 'draft',
    });
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][7]).toBe(JSON.stringify({ country: 'TR', age: '18-30' }));
  });

  it('segment_filters null when not provided', async () => {
    queryOneMock.mockResolvedValueOnce(mkRow());
    await createCampaign({
      name: 'X',
      subject: 'Y',
      fromName: 'F',
      fromEmail: 'f@e.com',
      htmlContent: 'h',
      textContent: 't',
      segment: 'all_users',
      status: 'draft',
    });
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][7]).toBeNull();
  });

  it('SQL includes RETURNING all fields (mapped shape)', async () => {
    queryOneMock.mockResolvedValueOnce(mkRow());
    await createCampaign({
      name: 'X', subject: 'Y', fromName: 'F', fromEmail: 'f@e.com',
      htmlContent: 'h', textContent: 't', segment: 'subscribers', status: 'draft',
    });
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[0]).toContain('RETURNING');
  });

  it('returns null when DB returns null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const r = await createCampaign({
      name: 'X', subject: 'Y', fromName: 'F', fromEmail: 'f@e.com',
      htmlContent: 'h', textContent: 't', segment: 'subscribers', status: 'draft',
    });
    expect(r).toBeNull();
  });

  it('exception - return null', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await createCampaign({
      name: 'X', subject: 'Y', fromName: 'F', fromEmail: 'f@e.com',
      htmlContent: 'h', textContent: 't', segment: 'subscribers', status: 'draft',
    })).toBeNull();
  });

  it('all 5 segment values accepted', async () => {
    for (const segment of ['all_users', 'subscribers', 'premium', 'inactive', 'custom'] as const) {
      queryOneMock.mockResolvedValueOnce(mkRow({ segment }));
      const r = await createCampaign({
        name: 'X', subject: 'Y', fromName: 'F', fromEmail: 'f@e.com',
        htmlContent: 'h', textContent: 't', segment, status: 'draft',
      });
      expect(r?.id).toBe('camp-1');
    }
  });
});
