/**
 * Unit Tests - privacy/privacy.ts vi.mock postgres+cache
 *
 * - getPrivacySettings — found → mapped shape
 * - getPrivacySettings — not found → auto-create defaults (profile_public true / show_email false)
 * - updatePrivacySettings — partial update + cache invalidate
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, insertMock, updateMock, deleteCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: vi.fn(),
  insert: insertMock,
  update: updateMock,
}));

vi.mock('../cache', () => ({
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(1);
});

import { getPrivacySettings, updatePrivacySettings } from '../privacy/privacy';

const mkSettings = (overrides: any = {}) => ({
  id: 'priv-1',
  user_id: 'u-1',
  profile_public: true,
  show_activity: true,
  show_reviews: true,
  show_email: false,
  allow_messages: true,
  show_followers: true,
  created_at: 't',
  updated_at: 't',
  ...overrides,
});

describe('getPrivacySettings', () => {
  it('found - mapped PrivacySettings shape', async () => {
    queryOneMock.mockResolvedValueOnce(mkSettings());
    const r = await getPrivacySettings('u-1');
    expect(r.user_id).toBe('u-1');
    expect(r.profile_public).toBe(true);
    expect(r.show_email).toBe(false);
  });

  it('not found - auto-create with defaults (profile_public true, show_email false)', async () => {
    queryOneMock.mockResolvedValueOnce(null); // not found
    insertMock.mockResolvedValueOnce(mkSettings()); // auto-create
    const r = await getPrivacySettings('u-1');
    expect(r.profile_public).toBe(true);
    expect(r.show_email).toBe(false);
    expect(insertMock).toHaveBeenCalled();
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].profile_public).toBe(true);
    expect(insertCall[1].show_email).toBe(false);
    expect(insertCall[1].allow_messages).toBe(true);
  });

  it('exception - throw', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(getPrivacySettings('u-1')).rejects.toThrow();
  });
});

describe('updatePrivacySettings', () => {
  it('partial update + cache invalidate', async () => {
    // Existing settings
    queryOneMock.mockResolvedValueOnce(mkSettings());
    updateMock.mockResolvedValueOnce(mkSettings({ profile_public: false, show_email: true }));

    const r = await updatePrivacySettings('u-1', { profile_public: false, show_email: true });
    expect(r.profile_public).toBe(false);
    expect(r.show_email).toBe(true);
    expect(deleteCacheMock).toHaveBeenCalledWith('privacy:u-1');
  });

  it('updated_at timestamp set in update payload', async () => {
    queryOneMock.mockResolvedValueOnce(mkSettings());
    updateMock.mockResolvedValueOnce(mkSettings());
    await updatePrivacySettings('u-1', { allow_messages: false });
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].updated_at).toBeDefined();
  });

  it('ensureSettings (getPrivacySettings) called before update', async () => {
    queryOneMock.mockResolvedValueOnce(mkSettings());
    updateMock.mockResolvedValueOnce(mkSettings());
    await updatePrivacySettings('u-1', { show_followers: false });
    expect(queryOneMock).toHaveBeenCalled();
  });

  it('exception - throw', async () => {
    queryOneMock.mockResolvedValueOnce(mkSettings());
    updateMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(updatePrivacySettings('u-1', { profile_public: false })).rejects.toThrow();
  });
});
