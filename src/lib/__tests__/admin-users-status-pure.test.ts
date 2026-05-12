/**
 * Unit Tests - admin/admin-users.ts (vi.mock postgres)
 *
 * - normalizeAdminUserStatusAction allowlist (activate/suspend/delete; bilinmeyen → throw)
 * - updateAdminUserStatus self-action throw "Kendi hesabınız üzerinde..."
 * - updateAdminUserStatus userId boş → throw "Kullanıcı bilgisi eksik"
 * - updateAdminUserStatus user not found → throw "Kullanıcı bulunamadı"
 * - ADMIN_USER_STATUS_MAP (activate→active, suspend→suspended, delete→deleted)
 * - updateAdminUsersStatusBulk - skipsSelf + uniqueUserIds dedup
 *
 * vi.hoisted - postgres + insert mocks (logAdminAction → insert).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, insertMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
  update: vi.fn(),
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  insertMock.mockResolvedValue({ id: 'log-1' });
});

import {
  normalizeAdminUserStatusAction,
  updateAdminUserStatus,
  updateAdminUsersStatusBulk,
} from '../admin/admin-users';

describe('normalizeAdminUserStatusAction allowlist', () => {
  it('valid actions - "activate" / "suspend" / "delete"', () => {
    expect(normalizeAdminUserStatusAction('activate')).toBe('activate');
    expect(normalizeAdminUserStatusAction('suspend')).toBe('suspend');
    expect(normalizeAdminUserStatusAction('delete')).toBe('delete');
  });

  it('invalid action - throw "Geçersiz kullanıcı işlemi"', () => {
    expect(() => normalizeAdminUserStatusAction('promote' as any)).toThrow(/Geçersiz/);
    expect(() => normalizeAdminUserStatusAction('') as any).toThrow(/Geçersiz/);
    expect(() => normalizeAdminUserStatusAction('ban' as any)).toThrow(/Geçersiz/);
  });
});

describe('updateAdminUserStatus', () => {
  it('valid - status update + log + return success', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'u-1' });
    const r = await updateAdminUserStatus('u-1', 'admin-1', 'suspend');
    expect(r.success).toBe(true);
    expect(r.action).toBe('suspend');
    expect(r.count).toBe(1);
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][0]).toBe('suspended'); // STATUS_MAP
    expect(insertMock).toHaveBeenCalled(); // logAdminAction
  });

  it('userId boş → throw "Kullanıcı bilgisi eksik"', async () => {
    await expect(updateAdminUserStatus('', 'admin-1', 'suspend')).rejects.toThrow(/eksik/);
  });

  it('userId === adminId (self-action) → throw "Kendi hesabınız üzerinde..."', async () => {
    await expect(updateAdminUserStatus('admin-1', 'admin-1', 'delete')).rejects.toThrow(/Kendi hesabınız/);
  });

  it('user not found → throw "Kullanıcı bulunamadı"', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(updateAdminUserStatus('non-existent', 'admin-1', 'activate')).rejects.toThrow(/bulunamadı/);
  });

  it('STATUS_MAP - activate → active', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'u-1' });
    await updateAdminUserStatus('u-1', 'admin-1', 'activate');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][0]).toBe('active');
  });

  it('STATUS_MAP - delete → deleted', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'u-1' });
    await updateAdminUserStatus('u-1', 'admin-1', 'delete');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][0]).toBe('deleted');
  });
});

describe('updateAdminUsersStatusBulk', () => {
  it('uniqueUserIds dedup + filters out admin self', async () => {
    queryManyMock.mockResolvedValueOnce([{ id: 'u-1' }, { id: 'u-2' }]);
    const r = await updateAdminUsersStatusBulk(
      ['u-1', 'u-2', 'u-1', 'admin-1', ''],
      'admin-1',
      'suspend'
    );
    expect(r.count).toBe(2);
    expect(r.skippedSelf).toBe(true);
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[1][1]).toEqual(['u-1', 'u-2']); // uniqued, no admin
  });

  it('all userIds excluded → throw "İşlem yapılacak kullanıcı bulunamadı"', async () => {
    await expect(updateAdminUsersStatusBulk(['admin-1'], 'admin-1', 'suspend'))
      .rejects.toThrow(/yapılacak kullanıcı bulunamadı/);
  });

  it('skippedSelf false when no self in list', async () => {
    queryManyMock.mockResolvedValueOnce([{ id: 'u-1' }]);
    const r = await updateAdminUsersStatusBulk(['u-1'], 'admin-1', 'activate');
    expect(r.skippedSelf).toBe(false);
  });
});
