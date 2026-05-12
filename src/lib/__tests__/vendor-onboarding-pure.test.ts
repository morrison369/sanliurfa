/**
 * Unit Tests - vendor/vendor-onboarding.ts vi.mock postgres
 *
 * - createVendorProfile (insert + return shape mapping)
 * - getVendorProfileByUserId (queryOne + null + shape)
 * - updateVendorProfile (allowlist field copy + only set if defined)
 * - saveOnboardingProgress / getOnboardingProgress
 * - isVendor (delegate getVendorProfileByUserId)
 * - approveVendor / rejectVendor (verification_status update)
 * - getPendingVerifications (status filter + shape)
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, insertMock, updateMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
  update: updateMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
});

import {
  createVendorProfile,
  getVendorProfileByUserId,
  updateVendorProfile,
  saveOnboardingProgress,
  getOnboardingProgress,
  completeOnboarding,
  isVendor,
  getPendingVerifications,
  approveVendor,
  rejectVendor,
} from '../vendor/vendor-onboarding';

const mkRow = (id = 'v-1') => ({
  id,
  user_id: 'u-1',
  business_name: 'Test Business',
  business_phone: '+90 414 123 4567',
  business_email: 'biz@example.com',
  business_website: 'https://biz.com',
  address: 'Address',
  city: 'Şanlıurfa',
  district: 'Merkez',
  latitude: 37.16,
  longitude: 38.79,
  business_category: 'restaurant',
  business_type: 'food',
  description: 'desc',
  logo: null,
  banner: null,
  is_verified: false,
  verification_status: 'pending',
  created_at: '2026-05-05',
  updated_at: '2026-05-05',
});

describe('createVendorProfile', () => {
  it('insert success - VendorProfile shape returned', async () => {
    insertMock.mockResolvedValueOnce(mkRow());
    const r = await createVendorProfile('u-1', { businessName: 'Test Business' });
    expect(r?.vendorId).toBe('v-1');
    expect(r?.businessName).toBe('Test Business');
    expect(r?.verificationStatus).toBe('pending');
  });

  it('insert returns null - return null', async () => {
    insertMock.mockResolvedValueOnce(null);
    const r = await createVendorProfile('u-1', { businessName: 'X' });
    expect(r).toBeNull();
  });

  it('exception - return null (catch handler)', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await createVendorProfile('u-1', { businessName: 'X' })).toBeNull();
  });
});

describe('getVendorProfileByUserId', () => {
  it('found - shape map (snake_case → camelCase)', async () => {
    queryOneMock.mockResolvedValueOnce(mkRow());
    const r = await getVendorProfileByUserId('u-1');
    expect(r?.vendorId).toBe('v-1');
    expect(r?.businessPhone).toBe('+90 414 123 4567');
  });

  it('not found - null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getVendorProfileByUserId('u-x')).toBeNull();
  });
});

describe('updateVendorProfile - allowlist', () => {
  it('only set defined fields - businessName + city update', async () => {
    updateMock.mockResolvedValueOnce(mkRow());
    await updateVendorProfile('v-1', { businessName: 'New Name', city: 'Yeni Şehir' });
    expect(updateMock).toHaveBeenCalled();
    const call = updateMock.mock.calls[0];
    expect(call[2].business_name).toBe('New Name');
    expect(call[2].city).toBe('Yeni Şehir');
    // Undefined fields not in update
    expect(call[2].business_phone).toBeUndefined();
  });

  it('latitude 0 - dahil edilir (=== undefined check)', async () => {
    updateMock.mockResolvedValueOnce(mkRow());
    await updateVendorProfile('v-1', { latitude: 0, longitude: 0 });
    const call = updateMock.mock.calls[0];
    expect(call[2].latitude).toBe(0);
    expect(call[2].longitude).toBe(0);
  });

  it('exception - return null', async () => {
    updateMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await updateVendorProfile('v-1', {})).toBeNull();
  });
});

describe('saveOnboardingProgress / getOnboardingProgress', () => {
  it('saveOnboardingProgress success - true', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'p-1' });
    expect(await saveOnboardingProgress('u-1', 1, { name: 'X' })).toBe(true);
  });

  it('getOnboardingProgress - shape map (step + completed + data)', async () => {
    queryManyMock.mockResolvedValueOnce([
      { step: 1, data: '{"name":"X"}' },
      { step: 2, data: null },
    ]);
    const r = await getOnboardingProgress('u-1');
    expect(r).toHaveLength(2);
    expect(r[0].completed).toBe(true);
    expect(r[1].completed).toBe(false);
  });
});

describe('completeOnboarding / isVendor', () => {
  it('completeOnboarding - update success → true', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'u-1' });
    expect(await completeOnboarding('u-1')).toBe(true);
  });

  it('isVendor - vendor profile found → true', async () => {
    queryOneMock.mockResolvedValueOnce(mkRow());
    expect(await isVendor('u-1')).toBe(true);
  });

  it('isVendor - vendor profile not found → false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await isVendor('u-x')).toBe(false);
  });
});

describe('approveVendor / rejectVendor', () => {
  it('approveVendor - verification_status approved + is_verified true', async () => {
    updateMock.mockResolvedValueOnce(mkRow());
    expect(await approveVendor('v-1')).toBe(true);
    const call = updateMock.mock.calls[0];
    expect(call[2].verification_status).toBe('approved');
    expect(call[2].is_verified).toBe(true);
  });

  it('rejectVendor - verification_status rejected + rejection_reason', async () => {
    updateMock.mockResolvedValueOnce(mkRow());
    expect(await rejectVendor('v-1', 'spam')).toBe(true);
    const call = updateMock.mock.calls[0];
    expect(call[2].verification_status).toBe('rejected');
    expect(call[2].rejection_reason).toBe('spam');
  });
});

describe('getPendingVerifications', () => {
  it('status pending filter - VendorProfile array shape', async () => {
    queryManyMock.mockResolvedValueOnce([mkRow('v-1'), mkRow('v-2')]);
    const r = await getPendingVerifications(10);
    expect(r).toHaveLength(2);
    expect(r[0].vendorId).toBe('v-1');
  });
});
