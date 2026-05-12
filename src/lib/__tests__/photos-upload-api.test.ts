/**
 * API Contract Tests - POST /api/photos/upload
 *
 * - Auth required → 401
 * - Multipart form data: file + placeId required → 422
 * - File size > 10MB → 422
 * - MIME allowlist: jpeg/png/webp only → 422
 * - HARD RULE #2: validateFileExtension (XSS via filename) → 422
 * - HARD RULE #2: validateImageSignature magic bytes → 422
 * - Place not found → 404
 * - HARD RULE #11: IDOR — non-admin non-owner → 403
 * - Per-place photo limit 50 → 422
 * - saveFile failure → 500
 * - Success → 201 with photo metadata
 *
 * vi.hoisted - file-storage + photo + postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  saveFileMock, validateImageSignatureMock, validateFileExtensionMock,
  uploadPhotoMock, getPhotoCountMock, queryOneMock,
} = vi.hoisted(() => ({
  saveFileMock: vi.fn(),
  validateImageSignatureMock: vi.fn(),
  validateFileExtensionMock: vi.fn(),
  uploadPhotoMock: vi.fn(),
  getPhotoCountMock: vi.fn(),
  queryOneMock: vi.fn(),
}));

vi.mock('../file/file-storage', () => ({
  saveFile: saveFileMock,
  validateImageSignature: validateImageSignatureMock,
  validateFileExtension: validateFileExtensionMock,
}));

vi.mock('../photo/photos', () => ({
  uploadPhoto: uploadPhotoMock,
  getPhotoCount: getPhotoCountMock,
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  saveFileMock.mockReset();
  saveFileMock.mockResolvedValue({ filePath: '/uploads/x.jpg', publicUrl: '/x.jpg' });
  validateImageSignatureMock.mockReset();
  validateImageSignatureMock.mockReturnValue(true);
  validateFileExtensionMock.mockReset();
  validateFileExtensionMock.mockReturnValue(true);
  uploadPhotoMock.mockReset();
  uploadPhotoMock.mockResolvedValue({ id: 'photo-1' });
  getPhotoCountMock.mockReset();
  getPhotoCountMock.mockResolvedValue(5);
  queryOneMock.mockReset();
  queryOneMock.mockResolvedValue({ id: 'place-1', owner_id: 'user-1' });
});

import { POST } from '../../pages/api/photos/upload';

const owner = { id: 'user-1', email: 'o@t.com', role: 'user' };
const admin = { id: 'admin-1', email: 'a@t.com', role: 'admin' };
const stranger = { id: 'user-2', email: 's@t.com', role: 'user' };

function makeFormDataRequest(fields: Record<string, any>) {
  const fd = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined && val !== null) fd.set(key, val);
  }
  return new Request('http://localhost/api/photos/upload', { method: 'POST', body: fd });
}

function makeImageFile(size = 1024, type = 'image/jpeg', name = 'photo.jpg') {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

describe('POST /api/photos/upload', () => {
  it('no auth → 401', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ file: makeImageFile(), placeId: 'place-1' }),
      locals: {},
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(401);
  });

  it('missing file → 422', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ placeId: 'place-1' }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('missing placeId → 422', async () => {
    const ctx: any = {
      request: makeFormDataRequest({ file: makeImageFile() }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('file > 10MB → 422', async () => {
    const big = makeImageFile(11 * 1024 * 1024);
    const ctx: any = {
      request: makeFormDataRequest({ file: big, placeId: 'place-1' }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('MIME not in allowlist (gif) → 422', async () => {
    const ctx: any = {
      request: makeFormDataRequest({
        file: makeImageFile(1024, 'image/gif', 'evil.gif'),
        placeId: 'place-1',
      }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('HARD RULE #2 - extension fail → 422', async () => {
    validateFileExtensionMock.mockReturnValueOnce(false);
    const ctx: any = {
      request: makeFormDataRequest({
        file: makeImageFile(1024, 'image/jpeg', 'evil.html'),
        placeId: 'place-1',
      }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('HARD RULE #2 - magic bytes mismatch → 422', async () => {
    validateImageSignatureMock.mockReturnValueOnce(false);
    const ctx: any = {
      request: makeFormDataRequest({
        file: makeImageFile(1024, 'image/jpeg'),
        placeId: 'place-1',
      }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
    expect(saveFileMock).not.toHaveBeenCalled();
  });

  it('place not found → 404', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const ctx: any = {
      request: makeFormDataRequest({ file: makeImageFile(), placeId: 'nope' }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(404);
  });

  it('HARD RULE #11 - non-owner non-admin → 403', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'place-1', owner_id: 'someone-else' });
    const ctx: any = {
      request: makeFormDataRequest({ file: makeImageFile(), placeId: 'place-1' }),
      locals: { user: stranger },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(403);
    expect(saveFileMock).not.toHaveBeenCalled();
  });

  it('admin bypass owner check → 201', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'place-1', owner_id: 'someone-else' });
    const ctx: any = {
      request: makeFormDataRequest({ file: makeImageFile(), placeId: 'place-1' }),
      locals: { user: admin },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
  });

  it('photo count >= 50 → 422 limit reached', async () => {
    getPhotoCountMock.mockResolvedValueOnce(50);
    const ctx: any = {
      request: makeFormDataRequest({ file: makeImageFile(), placeId: 'place-1' }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('saveFile throws → 500', async () => {
    saveFileMock.mockRejectedValueOnce(new Error('disk full'));
    const ctx: any = {
      request: makeFormDataRequest({ file: makeImageFile(), placeId: 'place-1' }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });

  it('owner success → 201 with photo metadata', async () => {
    uploadPhotoMock.mockResolvedValueOnce({ id: 'photo-1', file_path: '/uploads/x.jpg' });
    const ctx: any = {
      request: makeFormDataRequest({
        file: makeImageFile(),
        placeId: 'place-1',
        altText: 'Beautiful view',
        caption: 'Sunset',
      }),
      locals: { user: owner },
    };
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    expect(uploadPhotoMock).toHaveBeenCalledWith(
      'place-1', 'user-1', '/uploads/x.jpg', 1024, 'image/jpeg',
      'Beautiful view', 'Sunset'
    );
  });
});
