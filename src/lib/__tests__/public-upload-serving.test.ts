import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createPublicUploadEntityTag,
  getPublicUploadContentType,
  getPublicUploadFileInfo,
  getPublicUploadResponseMetadata,
  getPublicUploadsRoot,
  isPublicUploadNotModified,
  normalizePublicUploadRequestPath,
  PUBLIC_UPLOAD_CACHE_CONTROL,
  resolvePublicUploadPath,
} from '../uploads/public-upload-serving';

describe('public-upload-serving', () => {
  it('normalizes request paths safely', () => {
    expect(normalizePublicUploadRequestPath('/recipes//kaburga-dolmasi.jpg')).toBe('recipes/kaburga-dolmasi.jpg');
    expect(normalizePublicUploadRequestPath('\\recipes\\kaburga-dolmasi.jpg')).toBe('recipes/kaburga-dolmasi.jpg');
  });

  it('rejects traversal attempts outside public/uploads', () => {
    expect(resolvePublicUploadPath('../secrets.txt')).toBeNull();
    expect(resolvePublicUploadPath('recipes/../../../secrets.txt')).toBeNull();
  });

  it('resolves existing upload files under public/uploads', () => {
    const resolved = resolvePublicUploadPath('recipes/kaburga-dolmasi.jpg');
    expect(resolved).toBe(path.join(getPublicUploadsRoot(), 'recipes', 'kaburga-dolmasi.jpg'));

    const info = getPublicUploadFileInfo('recipes/kaburga-dolmasi.jpg');
    expect(info?.diskPath).toBe(resolved);
    expect(info?.size).toBeGreaterThan(0);
  });

  it('detects upload content types and cache policy', () => {
    expect(getPublicUploadContentType('recipes/kaburga-dolmasi.jpg')).toBe('image/jpeg');
    expect(getPublicUploadContentType('places/gobeklitepe.webp')).toBe('image/webp');
    expect(PUBLIC_UPLOAD_CACHE_CONTROL).toContain('max-age=86400');
    expect(PUBLIC_UPLOAD_CACHE_CONTROL).toContain('stale-while-revalidate=604800');
    expect(PUBLIC_UPLOAD_CACHE_CONTROL).not.toContain('immutable');
  });

  it('emits stable upload validators for conditional requests', () => {
    const metadata = getPublicUploadResponseMetadata('recipes/kaburga-dolmasi.jpg');
    expect(metadata).not.toBeNull();
    expect(metadata?.etag).toBe(createPublicUploadEntityTag(metadata?.size ?? 0, metadata?.mtimeMs ?? 0));
    expect(metadata?.lastModified).toMatch(/GMT$/);

    const ifNoneMatchHeaders = new Headers({ 'if-none-match': metadata?.etag ?? '' });
    expect(isPublicUploadNotModified(ifNoneMatchHeaders, metadata!)).toBe(true);

    const ifModifiedSinceHeaders = new Headers({ 'if-modified-since': metadata?.lastModified ?? '' });
    expect(isPublicUploadNotModified(ifModifiedSinceHeaders, metadata!)).toBe(true);
  });
});
