/**
 * Unit Tests - user/profile-settings.ts vi.mock postgres+auth
 *
 * - updateProfileSettings - trim + null fallback + username regex `/^[a-zA-Z0-9_]{3,30}$/`
 * - username invalid → throw "Kullanıcı adı 3-30 karakter olmalı..."
 * - changeAccountPassword - newPassword !== confirm → throw "Yeni şifreler eşleşmiyor"
 * - currentPassword wrong → throw "Mevcut şifre yanlış"
 * - missing password_hash → throw "Mevcut şifre doğrulanamadı"
 *
 * vi.hoisted - postgres + auth mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, updateMock, comparePasswordMock, hashPasswordMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  updateMock: vi.fn(),
  comparePasswordMock: vi.fn(),
  hashPasswordMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  update: updateMock,
}));

vi.mock('../auth', () => ({
  comparePassword: comparePasswordMock,
  hashPassword: hashPasswordMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  updateMock.mockReset();
  comparePasswordMock.mockReset();
  hashPasswordMock.mockReset();
  updateMock.mockResolvedValue({});
  hashPasswordMock.mockResolvedValue('$2a$12$hashed');
});

import { updateProfileSettings, changeAccountPassword } from '../user/profile-settings';

describe('updateProfileSettings', () => {
  it('valid input - update with trim + return success', async () => {
    const r = await updateProfileSettings({ id: 'u-1' }, {
      fullName: '  Ali Yılmaz  ',
      username: 'ali_yilmaz',
      bio: '  Şanlıurfa fotoğrafçı  ',
    });
    expect(r.success).toBe(true);
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].full_name).toBe('Ali Yılmaz');
    expect(updateCall[2].bio).toBe('Şanlıurfa fotoğrafçı');
  });

  it('empty trim → null fallback', async () => {
    await updateProfileSettings({ id: 'u-1' }, { fullName: '   ' });
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].full_name).toBeNull();
  });

  it('username invalid (too short < 3) - throw', async () => {
    await expect(updateProfileSettings({ id: 'u-1' }, { username: 'ab' }))
      .rejects.toThrow(/3-30 karakter/);
  });

  it('username invalid (too long > 30) - throw', async () => {
    await expect(updateProfileSettings({ id: 'u-1' }, { username: 'a'.repeat(31) }))
      .rejects.toThrow(/3-30 karakter/);
  });

  it('username invalid (special chars) - throw', async () => {
    await expect(updateProfileSettings({ id: 'u-1' }, { username: 'ali@yilmaz' }))
      .rejects.toThrow(/3-30 karakter/);
  });

  it('username valid (alphanumeric + underscore)', async () => {
    await updateProfileSettings({ id: 'u-1' }, { username: 'ali_yilmaz_123' });
    expect(updateMock).toHaveBeenCalled();
  });
});

describe('changeAccountPassword', () => {
  it('newPassword !== confirmPassword → throw "Yeni şifreler eşleşmiyor"', async () => {
    await expect(changeAccountPassword({ id: 'u-1' }, {
      currentPassword: 'old',
      newPassword: 'new123',
      confirmPassword: 'different',
    })).rejects.toThrow(/eşleşmiyor/);
  });

  it('user not found OR password_hash null - throw "Mevcut şifre doğrulanamadı"', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(changeAccountPassword({ id: 'u-1' }, {
      currentPassword: 'old',
      newPassword: 'new123',
      confirmPassword: 'new123',
    })).rejects.toThrow(/doğrulanamadı/);
  });

  it('currentPassword wrong - throw "Mevcut şifre yanlış"', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'u-1', password_hash: 'hash-old' });
    comparePasswordMock.mockResolvedValueOnce(false);
    await expect(changeAccountPassword({ id: 'u-1' }, {
      currentPassword: 'wrong',
      newPassword: 'new123',
      confirmPassword: 'new123',
    })).rejects.toThrow(/yanlış/);
  });

  it('valid - hash + update + return success', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'u-1', password_hash: 'hash-old' });
    comparePasswordMock.mockResolvedValueOnce(true);
    const r = await changeAccountPassword({ id: 'u-1' }, {
      currentPassword: 'old',
      newPassword: 'new123',
      confirmPassword: 'new123',
    });
    expect(r.success).toBe(true);
    expect(hashPasswordMock).toHaveBeenCalledWith('new123');
    expect(updateMock).toHaveBeenCalled();
  });
});
