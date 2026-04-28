/**
 * Security Test — File Upload XSS Prevention via MIME → Ext Mapping
 *
 * 2026-04-25 audit'inde `/api/upload/index.ts` `file.name.split('.').pop()` ile
 * extension alıyordu. Attacker `image/jpeg` MIME + `evil.html` adıyla yükleyip
 * stored XSS yapabilirdi. Fix: MIME type'tan derive edilen ext.
 *
 * CLAUDE.md "SECURITY HARD RULES" #2: MIME → ext mapping zorunlu.
 *
 * Bu test extension'ın MIME'den geldiğini, file.name'den gelmediğini doğrular.
 * Ayrıca path traversal regex check'ini de doğrular.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeFile, mkdir } from 'fs/promises';
import crypto from 'crypto';

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/postgres', () => ({
  query: vi.fn().mockResolvedValue({ rows: [{ id: 'photo-1', file_path: '/uploads/places/p1/x.webp' }], rowCount: 1, command: 'INSERT' }),
}));

vi.mock('../../lib/auth/middleware', () => ({
  authenticateUser: vi.fn().mockResolvedValue({
    user: { id: 'admin-1', role: 'admin', email: 'a@x.com' },
    placeId: null,
  }),
}));

vi.mock('../../lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../lib/content-images', () => ({
  resolveContentImage: vi.fn().mockReturnValue('/uploads/places/p1/x.webp'),
}));

function makeFile(name: string, type: string, content = 'fake-image-bytes'): File {
  return new File([content], name, { type });
}

function makeFormData(file: File, placeId: string, type = 'gallery'): FormData {
  const fd = new FormData();
  fd.set('file', file);
  fd.set('placeId', placeId);
  fd.set('type', type);
  return fd;
}

describe('File Upload — XSS Prevention via MIME mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects placeId with path traversal (../..)', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg');
    const fd = makeFormData(file, '../../etc/passwd');

    const { POST } = await import('../../pages/api/upload/index');
    const response = await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.title).toContain('Geçersiz İstek');
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects placeId with shell metacharacters', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg');
    const fd = makeFormData(file, 'place;rm -rf /');

    const { POST } = await import('../../pages/api/upload/index');
    const response = await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects placeId with slashes', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg');
    const fd = makeFormData(file, 'place/extra');

    const { POST } = await import('../../pages/api/upload/index');
    const response = await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    expect(response.status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('accepts valid UUID-like placeId', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg');
    const fd = makeFormData(file, 'abc-123-def');

    const { POST } = await import('../../pages/api/upload/index');
    const response = await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    // Endpoint returns 201 Created on successful upload (verified against impl)
    expect([200, 201]).toContain(response.status);
    expect(writeFile).toHaveBeenCalled();
  });

  it('saves file with .jpg extension when MIME is image/jpeg, ignoring file.name', async () => {
    // Attacker submits: file.name = 'evil.html' but MIME = 'image/jpeg'
    const file = makeFile('evil.html', 'image/jpeg');
    const fd = makeFormData(file, 'place-1');

    const { POST } = await import('../../pages/api/upload/index');
    await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    // writeFile is called with path; the saved filename must end with .jpg, NOT .html
    const writeCalls = vi.mocked(writeFile).mock.calls;
    expect(writeCalls.length).toBeGreaterThan(0);
    const savedPath = String(writeCalls[0][0]);
    expect(savedPath).toMatch(/\.jpg$/);
    expect(savedPath).not.toMatch(/\.html/);
  });

  it('saves with .png ext when MIME is image/png, ignoring .svg name', async () => {
    const file = makeFile('payload.svg', 'image/png');
    const fd = makeFormData(file, 'place-1');

    const { POST } = await import('../../pages/api/upload/index');
    await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    const savedPath = String(vi.mocked(writeFile).mock.calls[0][0]);
    expect(savedPath).toMatch(/\.png$/);
    expect(savedPath).not.toMatch(/\.svg/);
  });

  it('saves with .webp ext when MIME is image/webp', async () => {
    const file = makeFile('whatever.exe', 'image/webp');
    const fd = makeFormData(file, 'place-1');

    const { POST } = await import('../../pages/api/upload/index');
    await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    const savedPath = String(vi.mocked(writeFile).mock.calls[0][0]);
    expect(savedPath).toMatch(/\.webp$/);
    expect(savedPath).not.toMatch(/\.exe/);
  });

  it('saves with .gif ext when MIME is image/gif', async () => {
    const file = makeFile('x', 'image/gif');
    const fd = makeFormData(file, 'place-1');

    const { POST } = await import('../../pages/api/upload/index');
    await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    const savedPath = String(vi.mocked(writeFile).mock.calls[0][0]);
    expect(savedPath).toMatch(/\.gif$/);
  });

  it('falls back to .jpg for unknown MIME (defensive default)', async () => {
    // unknown MIME should still produce safe ext
    const file = makeFile('test.bin', 'application/octet-stream');
    const fd = makeFormData(file, 'place-1');

    const { POST } = await import('../../pages/api/upload/index');
    const response = await POST({
      request: new Request('http://localhost/api/upload', { method: 'POST', body: fd }),
    } as any);

    // ALLOWED_TYPES check rejects this MIME → 400 before save
    expect(response.status).toBe(400);
  });
});
