/**
 * Unit Tests - admin/historical-sites-admin.ts
 *
 * - normalizeHistoricalSiteInput required-field validation (name/desc/location)
 * - createSlug Türkçe ASCII + lowercase + 100 cap
 * - normalizeImages CSV string → array + buildSlugImagePath fallback
 * - normalizeNumber NaN guard (HARD RULE #17)
 * - status allowlist (draft/active/inactive fallback draft)
 * - normalizeBoolean (on/true/1)
 * - createAdminHistoricalSite insert; updateAdminHistoricalSite + deleteAdminHistoricalSite id required
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insertMock, updateMock, removeMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  insert: insertMock,
  update: updateMock,
  remove: removeMock,
}));

beforeEach(() => {
  insertMock.mockReset();
  updateMock.mockReset();
  removeMock.mockReset();
});

import {
  createAdminHistoricalSite,
  updateAdminHistoricalSite,
  deleteAdminHistoricalSite,
} from '../admin/historical-sites-admin';

const validInput = {
  name: 'Göbeklitepe',
  description: 'Dünyanın en eski tapınağı',
  location: 'Şanlıurfa',
};

describe('createAdminHistoricalSite', () => {
  it('valid - insert + Türkçe slug', async () => {
    insertMock.mockResolvedValueOnce({});
    const r = await createAdminHistoricalSite(validInput);
    expect(r.success).toBe(true);
    const call = insertMock.mock.calls[0];
    expect(call[0]).toBe('historical_sites');
    expect(call[1].slug).toBe('gobeklitepe');
    expect(call[1].name).toBe('Göbeklitepe');
  });

  it('missing required - throw', async () => {
    await expect(createAdminHistoricalSite({ ...validInput, name: '' })).rejects.toThrow(/zorunludur/);
    await expect(createAdminHistoricalSite({ ...validInput, description: '   ' })).rejects.toThrow(/zorunludur/);
    await expect(createAdminHistoricalSite({ ...validInput, location: '' })).rejects.toThrow(/zorunludur/);
  });

  it('normalizeNumber NaN guard - HARD RULE #17', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminHistoricalSite({ ...validInput, latitude: '37.1591', longitude: '38.7969' });
    expect(insertMock.mock.calls[0][1].latitude).toBe(37.1591);
    expect(insertMock.mock.calls[0][1].longitude).toBe(38.7969);

    insertMock.mockResolvedValueOnce({});
    await createAdminHistoricalSite({ ...validInput, latitude: 'abc' as any, longitude: '' });
    expect(insertMock.mock.calls[1][1].latitude).toBeNull();
    expect(insertMock.mock.calls[1][1].longitude).toBeNull();
  });

  it('normalizeImages CSV string → array', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminHistoricalSite({ ...validInput, images: '/img/a.jpg, /img/b.jpg, /img/c.jpg' });
    expect(insertMock.mock.calls[0][1].images).toEqual(['/img/a.jpg', '/img/b.jpg', '/img/c.jpg']);
  });

  it('normalizeImages array passthrough', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminHistoricalSite({ ...validInput, images: ['/img/x.jpg'] });
    expect(insertMock.mock.calls[0][1].images).toEqual(['/img/x.jpg']);
  });

  it('normalizeImages empty - fallback to placeholder/slug image', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminHistoricalSite({ ...validInput, images: null });
    const images = insertMock.mock.calls[0][1].images;
    expect(Array.isArray(images)).toBe(true);
    expect(images.length).toBeGreaterThan(0);
  });

  it('status allowlist - active passthrough / invalid → draft', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminHistoricalSite({ ...validInput, status: 'active' });
    expect(insertMock.mock.calls[0][1].status).toBe('active');

    insertMock.mockResolvedValueOnce({});
    await createAdminHistoricalSite({ ...validInput, status: 'published' });
    expect(insertMock.mock.calls[1][1].status).toBe('draft');
  });

  it('isUnesco / isFeatured normalizeBoolean', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminHistoricalSite({ ...validInput, isUnesco: 'on', isFeatured: 'true' });
    expect(insertMock.mock.calls[0][1].is_unesco).toBe(true);
    expect(insertMock.mock.calls[0][1].is_featured).toBe(true);
  });
});

describe('updateAdminHistoricalSite', () => {
  it('valid - update', async () => {
    updateMock.mockResolvedValueOnce({});
    const r = await updateAdminHistoricalSite('s-1', validInput);
    expect(r.success).toBe(true);
    expect(updateMock.mock.calls[0][1]).toBe('s-1');
  });

  it('id missing - throw', async () => {
    await expect(updateAdminHistoricalSite('', validInput)).rejects.toThrow(/eksik/);
  });
});

describe('deleteAdminHistoricalSite', () => {
  it('valid - remove', async () => {
    removeMock.mockResolvedValueOnce({});
    const r = await deleteAdminHistoricalSite('s-1');
    expect(r.success).toBe(true);
    expect(removeMock.mock.calls[0]).toEqual(['historical_sites', 's-1']);
  });

  it('id missing - throw', async () => {
    await expect(deleteAdminHistoricalSite('')).rejects.toThrow(/eksik/);
  });
});
