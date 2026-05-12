/**
 * API Contract Tests - POST /api/files/upload
 *
 * - Auth required → 401
 * - Content-Type must be multipart/form-data → 422
 * - File required → 422
 * - File size max 10MB → 422
 * - MIME allowlist: jpeg/png/webp/gif/pdf → 422 if not
 * - HARD RULE #2: validateFileExtension XSS guard → 422
 * - HARD RULE #2: validateImageSignature magic bytes (image/* only) → 422
 * - Folder allowlist (places/avatars/blog/events/general) → fallback "general"
 * - DB s3_files INSERT (legacy table name for local files)
 * - DB INSERT non-fatal (file already saved to disk)
 *
 * vi.hoisted - file-storage + postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  saveFileMock, validateImageSignatureMock, validateFileExtensionMock, queryMock,
} = vi.hoisted(() => ({
  saveFileMock: vi.fn(),
  validateImageSignatureMock: vi.fn(),
  validateFileExtensionMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock('../file/file-storage', () => ({
  saveFile: saveFileMock,
  validateImageSignature: validateImageSignatureMock,
  validateFileExtension: validateFileExtensionMock,
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

beforeEach(() => {
  saveFileMock.mockReset();
  saveFileMock.mockResolvedValue({ filePath: '/uploads/x.jpg', publicUrl: '/x.jpg' });
  validateImageSignatureMock.mockReset();
  validateImageSignatureMock.mockReturnValue(true);
  validateFileExtensionMock.mockReset();
  validateFileExtensionMock.mockReturnValue(true);
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rowCount: 1 });
});

import { POST } from '../../pages/api/files/upload';

const authedUser = { id: 'user-1', email: 'u@t.com', role: 'user' };

function makeFormDataRequest(fields: Record<string, any>) {
  const fd = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined && val !== null) fd.set(key, val);
  }
  return new Request('http://localhost/api/files/upload', { method: 'POST', body: fd });
}

function makeFile(size = 1024, type = 'image/jpeg', name = 'photo.jpg') {
  return new File([new Uint8Array(size)], name, { type });
}

describe('POST /api/files/upload', () => {
  it('no auth → 401', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile() }),
      locals: {},
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
  });

  it('non-multipart Content-Type → 422', async () => {
    const req = new Request('http://localhost/api/files/upload', {
      method: 'POST',
      body: JSON.stringify({ file: 'fake' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const ctx: any = { request: req, locals: { user: authedUser } };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('missing file → 422', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ folder: 'places' }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('file > 10MB → 422', async () => {
    const big = makeFile(11 * 1024 * 1024);
    const ctx: any = {
      request: makeFormDataRequest({ file: big }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('MIME not in allowlist (text/html) → 422', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile(1024, 'text/html', 'evil.html') }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('PDF MIME accepted (allowlist 5: jpeg/png/webp/gif/pdf)', async () => {
    const ctx: any = {
      request: makeFormDataRequest({
        file: makeFile(1024, 'application/pdf', 'doc.pdf'),
      }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    expect(validateImageSignatureMock).not.toHaveBeenCalled(); // PDF skip magic bytes
  });

  it('GIF MIME accepted', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile(1024, 'image/gif', 'img.gif') }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
  });

  it('HARD RULE #2 - extension fail → 422', async () => {
    validateFileExtensionMock.mockReturnValueOnce(false);
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile(1024, 'image/jpeg', 'evil.html') }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('HARD RULE #2 - magic bytes mismatch → 422 (images only)', async () => {
    validateImageSignatureMock.mockReturnValueOnce(false);
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile(1024, 'image/jpeg') }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
    expect(saveFileMock).not.toHaveBeenCalled();
  });

  it('folder allowlist accepts places/avatars/blog/events/general', async () => {
    for (const folder of ['places', 'avatars', 'blog', 'events', 'general']) {
      saveFileMock.mockClear();
      const ctx: any = {
        request: makeFormDataRequest({ file: makeFile(), folder }),
        locals: { user: authedUser },
      };
      const resp = await POST(ctx);
      expect(resp.status).toBe(200);
      expect(saveFileMock.mock.calls[0][1]).toBe(folder);
    }
  });

  it('invalid folder → fallback "general"', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile(), folder: '../etc' }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(200);
    expect(saveFileMock.mock.calls[0][1]).toBe('general');
  });

  it('default folder when missing → "general"', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile() }),
      locals: { user: authedUser },
    };
    await POST(ctx);
    expect(saveFileMock.mock.calls[0][1]).toBe('general');
  });

  it('success → 200 + DB INSERT into s3_files (legacy table for local files)', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile(), folder: 'places' }),
      locals: { user: authedUser },
    };
    await POST(ctx);
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toContain('INSERT INTO s3_files');
    expect(sql).toContain("'local'"); // s3_bucket = 'local' (no S3)
  });

  it('DB INSERT failure non-fatal (file already on disk)', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB error'));
    const ctx: any = {
      request: makeFormDataRequest({ file: makeFile() }),
      locals: { user: authedUser },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(200); // catch silently swallows DB error
  });
});
