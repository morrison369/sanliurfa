/**
 * Unit Tests - admin/events-admin.ts
 *
 * - normalizeEventInput required-field validation
 * - createSlug Türkçe ASCII + 100 char cap
 * - normalizeBoolean (on/true/1 → true)
 * - normalizeStatus (draft/published/cancelled allowlist, fallback draft)
 * - createAdminEvent insert; updateAdminEvent + deleteAdminEvent id required
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

import { createAdminEvent, updateAdminEvent, deleteAdminEvent } from '../admin/events-admin';

const validInput = {
  title: 'Şanlıurfa Festivali',
  description: 'Yerel kültür buluşması',
  location: 'Balıklıgöl',
  startDate: '2026-06-01',
  category: 'kultur',
};

describe('createAdminEvent', () => {
  it('valid input - insert + Türkçe slug', async () => {
    insertMock.mockResolvedValueOnce({ id: 'e-1' });
    const r = await createAdminEvent(validInput);
    expect(r.success).toBe(true);
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[0]).toBe('events');
    expect(insertCall[1].slug).toBe('sanliurfa-festivali');
    expect(insertCall[1].title).toBe('Şanlıurfa Festivali');
  });

  it('missing required - throw', async () => {
    await expect(createAdminEvent({ ...validInput, title: '' })).rejects.toThrow(/zorunludur/);
    await expect(createAdminEvent({ ...validInput, location: '   ' })).rejects.toThrow(/zorunludur/);
  });

  it('normalizeBoolean - "on" / "true" / "1" → true', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminEvent({ ...validInput, isFeatured: 'on' });
    expect(insertMock.mock.calls[0][1].is_featured).toBe(true);

    insertMock.mockResolvedValueOnce({});
    await createAdminEvent({ ...validInput, isFeatured: '1' });
    expect(insertMock.mock.calls[1][1].is_featured).toBe(true);

    insertMock.mockResolvedValueOnce({});
    await createAdminEvent({ ...validInput, isFeatured: false });
    expect(insertMock.mock.calls[2][1].is_featured).toBe(false);
  });

  it('normalizeStatus - allowlist fallback draft', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminEvent({ ...validInput, status: 'published' });
    expect(insertMock.mock.calls[0][1].status).toBe('published');

    insertMock.mockResolvedValueOnce({});
    await createAdminEvent({ ...validInput, status: 'invalid_status' });
    expect(insertMock.mock.calls[1][1].status).toBe('draft');
  });

  it('endDate optional null', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminEvent(validInput);
    expect(insertMock.mock.calls[0][1].end_date).toBeNull();
  });

  it('userId → created_by passthrough', async () => {
    insertMock.mockResolvedValueOnce({});
    await createAdminEvent({ ...validInput, userId: 'u-1' });
    expect(insertMock.mock.calls[0][1].created_by).toBe('u-1');
  });
});

describe('updateAdminEvent', () => {
  it('valid - update', async () => {
    updateMock.mockResolvedValueOnce({});
    const r = await updateAdminEvent('e-1', validInput);
    expect(r.success).toBe(true);
    expect(updateMock.mock.calls[0][0]).toBe('events');
    expect(updateMock.mock.calls[0][1]).toBe('e-1');
  });

  it('id missing - throw', async () => {
    await expect(updateAdminEvent('', validInput)).rejects.toThrow(/eksik/);
  });
});

describe('deleteAdminEvent', () => {
  it('valid - remove', async () => {
    removeMock.mockResolvedValueOnce({});
    const r = await deleteAdminEvent('e-1');
    expect(r.success).toBe(true);
    expect(removeMock.mock.calls[0]).toEqual(['events', 'e-1']);
  });

  it('id missing - throw', async () => {
    await expect(deleteAdminEvent('')).rejects.toThrow(/eksik/);
  });
});
