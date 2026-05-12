/**
 * Unit Tests - content/content-management.ts createContent + updateContent
 *
 * - createContent slug from title (lowercase + replace whitespace + remove non-word chars)
 * - contentKey = slug + Date.now()
 * - default content_type 'article' + visibility 'private' + status 'draft'
 * - createContent audit_trail insert
 * - updateContent owner check (author_id !== userId → false)
 * - updateContent version_number increment
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
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue('OK'),
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(1);
});

import { createContent, updateContent } from '../content/content-management';

describe('createContent', () => {
  it('slug generation - lowercase + whitespace → hyphen + non-word strip', async () => {
    insertMock
      .mockResolvedValueOnce({ id: 'content-1' }) // content_items
      .mockResolvedValueOnce({ id: 'audit-1' }); // audit_trail

    await createContent('u-1', { title: 'My Post Title!' });
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].slug).toBe('my-post-title');
    expect(insertCall[1].content_key).toContain('my-post-title-');
  });

  it('default content_type "article" + visibility "private" + status "draft"', async () => {
    insertMock
      .mockResolvedValueOnce({ id: 'c-1' })
      .mockResolvedValueOnce({ id: 'a-1' });

    await createContent('u-1', { title: 'Test' });
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].content_type).toBe('article');
    expect(insertCall[1].visibility).toBe('private');
    expect(insertCall[1].status).toBe('draft');
  });

  it('custom content_type + visibility', async () => {
    insertMock
      .mockResolvedValueOnce({ id: 'c-1' })
      .mockResolvedValueOnce({ id: 'a-1' });

    await createContent('u-1', { title: 'Test', content_type: 'video', visibility: 'public' });
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].content_type).toBe('video');
    expect(insertCall[1].visibility).toBe('public');
  });

  it('audit_trail insert - "created" action_type', async () => {
    insertMock
      .mockResolvedValueOnce({ id: 'c-1' })
      .mockResolvedValueOnce({ id: 'a-1' });

    await createContent('u-1', { title: 'X' });
    const auditCall = insertMock.mock.calls[1];
    expect(auditCall[0]).toBe('content_audit_trail');
    expect(auditCall[1].action_type).toBe('created');
    expect(auditCall[1].changes).toEqual({ created: true });
  });

  it('insert exception - return null', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    const r = await createContent('u-1', { title: 'X' });
    expect(r).toBeNull();
  });

  it('seo_keywords default empty array', async () => {
    insertMock
      .mockResolvedValueOnce({ id: 'c-1' })
      .mockResolvedValueOnce({ id: 'a-1' });

    await createContent('u-1', { title: 'X' });
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].seo_keywords).toEqual([]);
  });
});

describe('updateContent', () => {
  it('owner mismatch - false (no update)', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'c-1',
      author_id: 'other-user',
      title: 'Old',
      content: 'old content',
      version_number: 1,
    });
    expect(await updateContent('c-1', 'u-1', { title: 'New' })).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('content not found - false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await updateContent('non-existent', 'u-1', {})).toBe(false);
  });

  it('owner match - version_number increment + audit_trail "updated"', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'c-1',
      author_id: 'u-1',
      title: 'Old',
      content: 'old',
      version_number: 1,
    });
    insertMock
      .mockResolvedValueOnce({ id: 'v-1' }) // content_versions
      .mockResolvedValueOnce({ id: 'a-1' }); // audit_trail

    const r = await updateContent('c-1', 'u-1', { title: 'New' });
    expect(r).toBe(true);

    const versionCall = insertMock.mock.calls[0];
    expect(versionCall[0]).toBe('content_versions');
    expect(versionCall[1].version_number).toBe(2); // 1 + 1

    const auditCall = insertMock.mock.calls[1];
    expect(auditCall[1].action_type).toBe('updated');
  });
});
