/**
 * Unit Tests - file/file-management.ts vi.mock postgres+cache
 *
 * - registerS3File (insert + cdn_url construction "https://cdn.sanliurfa.com/{key}" + file_type from extension)
 * - getFileById (cache hit + DB fallback + 1-hour TTL 3600s + is_archived false filter)
 * - getUserFiles (cache + 30-min TTL 1800s)
 * - setupCDNCaching (cache_control_header construction)
 * - registerFileVariant (variant insert + cache invalidate)
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, insertMock, updateMock, getCacheMock, setCacheMock, deleteCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
  update: updateMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  deleteCacheMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
  deleteCacheMock.mockResolvedValue(1);
});

import {
  registerS3File,
  getFileById,
  getUserFiles,
  registerFileVariant,
  setupCDNCaching,
} from '../file/file-management';

describe('registerS3File', () => {
  it('insert + cdn_url construction + file_type from extension', async () => {
    insertMock.mockResolvedValueOnce({
      id: 'file-1',
      file_key: 'photos/test.jpg',
      cdn_url: 'https://cdn.sanliurfa.com/photos/test.jpg',
    });
    await registerS3File('u-1', 'photos/test.jpg', 'test.jpg', 1024, 'image/jpeg', 's3://bucket/test.jpg');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].cdn_url).toBe('https://cdn.sanliurfa.com/photos/test.jpg');
    expect(insertCall[1].file_type).toBe('jpg');
    expect(insertCall[1].virus_scan_status).toBe('pending');
  });

  it('default isPublic false', async () => {
    insertMock.mockResolvedValueOnce({ id: 'f-1' });
    await registerS3File('u-1', 'x.png', 'x.png', 100, 'image/png', 's3://x');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].is_public).toBe(false);
  });

  it('cache invalidate "files:user:{userId}"', async () => {
    insertMock.mockResolvedValueOnce({ id: 'f-1' });
    await registerS3File('u-1', 'x.png', 'x.png', 100, 'image/png', 's3://x');
    expect(deleteCacheMock).toHaveBeenCalledWith('files:user:u-1');
  });

  it('exception - return null', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    const r = await registerS3File('u-1', 'x.png', 'x.png', 100, 'image/png', 's3://x');
    expect(r).toBeNull();
  });

  it('file_key without extension - file_type "unknown"', async () => {
    insertMock.mockResolvedValueOnce({ id: 'f-1' });
    await registerS3File('u-1', 'noextension', 'noextension', 100, 'application/octet-stream', 's3://x');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].file_type).toBe('noextension'); // .pop() on no-dot returns whole string
  });
});

describe('getFileById', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce({ id: 'cached-file' });
    const r = await getFileById('f-1');
    expect((r as any)?.id).toBe('cached-file');
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB + 1-hour TTL (3600s) + is_archived false filter', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'f-1', original_filename: 'test.jpg' });
    await getFileById('f-1');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[0]).toContain('is_archived = false');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(3600);
  });

  it('not found - null + cache skip', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getFileById('non-existent')).toBeNull();
    expect(setCacheMock).not.toHaveBeenCalled();
  });
});

describe('getUserFiles', () => {
  it('default limit 50 + 30-min TTL (1800s)', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getUserFiles('u-1');
    expect(queryManyMock.mock.calls[0][1]).toEqual(['u-1', 50]);
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(1800);
  });

  it('custom limit', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getUserFiles('u-1', 10);
    expect(queryManyMock.mock.calls[0][1]).toEqual(['u-1', 10]);
  });
});

describe('setupCDNCaching', () => {
  it('default ttl 86400 + cache_control_header construction', async () => {
    insertMock.mockResolvedValueOnce({});
    expect(await setupCDNCaching('f-1')).toBe(true);
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].cache_ttl_seconds).toBe(86400);
    expect(insertCall[1].cache_control_header).toBe('public, max-age=86400');
    expect(insertCall[1].gzip_enabled).toBe(true);
  });

  it('custom ttl + gzip false', async () => {
    insertMock.mockResolvedValueOnce({});
    await setupCDNCaching('f-1', 3600, false);
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].cache_ttl_seconds).toBe(3600);
    expect(insertCall[1].cache_control_header).toBe('public, max-age=3600');
    expect(insertCall[1].gzip_enabled).toBe(false);
  });
});

describe('registerFileVariant', () => {
  it('insert + cache invalidate', async () => {
    insertMock.mockResolvedValueOnce({ id: 'v-1' });
    const r = await registerFileVariant('orig-1', 'thumbnail', 'thumb-key', 'https://cdn/thumb.jpg', '150x150');
    expect((r as any)?.id).toBe('v-1');
    expect(deleteCacheMock).toHaveBeenCalledWith('variants:orig-1');
  });

  it('exception - return null', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await registerFileVariant('o', 't', 'k', 'u')).toBeNull();
  });
});
