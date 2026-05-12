/**
 * Unit Tests - email/email-marketing.ts vi.mock postgres
 *
 * - createMarketingCampaign (insert with crypto.randomUUID id + status 'draft' default + counters 0)
 * - getMarketingCampaign (DB lookup + null return)
 * - getUserCampaigns (filter status optional)
 * - updateMarketingCampaign ownership check throw "Unauthorized"
 * - launchCampaign with scheduledFor → 'scheduled' / without → 'active'
 * - deleteCampaign + pauseCampaign ownership check throw
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, queryManyMock, insertMock, updateMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
  update: updateMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
});

import {
  createMarketingCampaign,
  getMarketingCampaign,
  getUserCampaigns,
  updateMarketingCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
} from '../email/email-marketing';

const mkCampaign = (overrides: any = {}) => ({
  id: 'camp-1',
  user_id: 'u-1',
  name: 'Spring Promo',
  campaign_type: 'newsletter',
  status: 'draft',
  subject_line: 'Spring Sale',
  html_content: '<p>Hi</p>',
  from_email: 'sender@example.com',
  send_count: 0,
  open_count: 0,
  click_count: 0,
  bounce_count: 0,
  unsubscribe_count: 0,
  spent_cents: 0,
  created_at: 't',
  updated_at: 't',
  ...overrides,
});

describe('createMarketingCampaign', () => {
  it('insert + status "draft" default + counters 0', async () => {
    insertMock.mockResolvedValueOnce(mkCampaign());
    const r = await createMarketingCampaign(
      'u-1',
      'Spring Promo',
      'newsletter',
      'sender@example.com',
      'Subject',
      '<p>Content</p>'
    );
    expect(r.id).toBe('camp-1');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].status).toBe('draft');
    expect(insertCall[1].send_count).toBe(0);
    expect(insertCall[1].open_count).toBe(0);
    expect(insertCall[1].spent_cents).toBe(0);
  });

  it('plainTextContent optional - null', async () => {
    insertMock.mockResolvedValueOnce(mkCampaign());
    await createMarketingCampaign('u-1', 'X', 't', 'e', 's', 'h');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].plain_text_content).toBeNull();
  });

  it('exception - throw', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(createMarketingCampaign('u-1', 'X', 't', 'e', 's', 'h')).rejects.toThrow();
  });
});

describe('getMarketingCampaign', () => {
  it('found - mapped Campaign shape', async () => {
    queryOneMock.mockResolvedValueOnce(mkCampaign());
    const r = await getMarketingCampaign('camp-1');
    expect(r?.id).toBe('camp-1');
    expect(r?.subjectLine).toBe('Spring Sale');
  });

  it('not found - null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getMarketingCampaign('non-existent')).toBeNull();
  });
});

describe('getUserCampaigns', () => {
  it('no status filter - default ORDER BY created_at DESC', async () => {
    queryManyMock.mockResolvedValueOnce([mkCampaign()]);
    const r = await getUserCampaigns('u-1');
    expect(r).toHaveLength(1);
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['u-1', 50, 0]);
  });

  it('status filter applied to SQL', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getUserCampaigns('u-1', 'active');
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['u-1', 'active', 50, 0]);
  });
});

describe('updateMarketingCampaign / deleteCampaign / launchCampaign', () => {
  it('updateMarketingCampaign - owner check throw "Unauthorized"', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'real-owner' });
    await expect(updateMarketingCampaign('c-1', 'fake-user', { name: 'X' })).rejects.toThrow(/Unauthorized/);
  });

  it('updateMarketingCampaign - campaign not found → throw', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(updateMarketingCampaign('c-1', 'u-1', {})).rejects.toThrow(/Unauthorized/);
  });

  it('deleteCampaign - owner check + DELETE + true', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'u-1' });
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteCampaign('c-1', 'u-1')).toBe(true);
  });

  it('deleteCampaign - owner mismatch - false (catch handler)', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'real-owner' });
    expect(await deleteCampaign('c-1', 'fake-user')).toBe(false);
  });

  it('launchCampaign with scheduledFor → status "scheduled"', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'u-1' });
    updateMock.mockResolvedValueOnce(mkCampaign({ status: 'scheduled' }));
    const futureDate = new Date(Date.now() + 86400000);
    await launchCampaign('c-1', 'u-1', futureDate);
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].status).toBe('scheduled');
    expect(updateCall[2].started_at).toBeNull();
  });

  it('launchCampaign without scheduledFor → status "active" + started_at NOW', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'u-1' });
    updateMock.mockResolvedValueOnce(mkCampaign({ status: 'active' }));
    await launchCampaign('c-1', 'u-1');
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].status).toBe('active');
    expect(updateCall[2].started_at).toBeInstanceOf(Date);
  });

  it('pauseCampaign - status "paused"', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'u-1' });
    updateMock.mockResolvedValueOnce(mkCampaign({ status: 'paused' }));
    const r = await pauseCampaign('c-1', 'u-1');
    expect(r?.status).toBe('paused');
  });
});
