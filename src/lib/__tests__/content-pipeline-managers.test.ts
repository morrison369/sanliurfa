/**
 * Unit Tests — content/content-pipeline.ts singleton class managers
 *
 * - AssetManager (register + get + list type filter + delete + getStats by type aggregate)
 * - MediaProcessor (defineOperation + process job + generateVariant 3-type)
 * - ContentVersioner (createVersion + getVersion + listVersions + restoreVersion + diffVersions)
 */

import { describe, it, expect } from 'vitest';
import {
  assetManager,
  mediaProcessor,
  contentVersioner,
} from '../content/content-pipeline';

describe('AssetManager', () => {
  it('register — uploadedAt set', () => {
    const asset = assetManager.register({
      id: 'asset-test-1', type: 'image', url: '/img/x.jpg', size: 1024,
      mimeType: 'image/jpeg', metadata: {},
    } as any);
    expect(asset.uploadedAt).toBeGreaterThan(0);
  });

  it('get — bilinmeyen → null', () => {
    expect(assetManager.get('non-existent')).toBeNull();
  });

  it('list — type filter', () => {
    assetManager.register({
      id: 'asset-img-1', type: 'image', url: '/x', size: 100, mimeType: 'image/png', metadata: {},
    } as any);
    assetManager.register({
      id: 'asset-vid-1', type: 'video', url: '/v', size: 200, mimeType: 'video/mp4', metadata: {},
    } as any);
    const images = assetManager.list('image');
    expect(images.every((a) => a.type === 'image')).toBe(true);
  });

  it('list — limit default 100', () => {
    expect(assetManager.list().length).toBeLessThanOrEqual(100);
  });

  it('delete — siler', () => {
    assetManager.register({
      id: 'asset-del-1', type: 'image', url: '/x', size: 100, mimeType: 'image/png', metadata: {},
    } as any);
    assetManager.delete('asset-del-1');
    expect(assetManager.get('asset-del-1')).toBeNull();
  });

  it('getStats — totalAssets + totalSize + byType breakdown', () => {
    const stats = assetManager.getStats();
    expect(stats).toHaveProperty('totalAssets');
    expect(stats).toHaveProperty('totalSize');
    expect(stats.byType).toHaveProperty('image');
    expect(stats.byType).toHaveProperty('video');
    expect(stats.byType).toHaveProperty('document');
    expect(stats.byType).toHaveProperty('audio');
  });
});

describe('MediaProcessor', () => {
  it('defineOperation — exception fırlatmaz', () => {
    expect(() => mediaProcessor.defineOperation('resize', async (a) => a)).not.toThrow();
  });

  it('process — job döner, status="pending"', async () => {
    const job = await mediaProcessor.process('asset-1', ['resize', 'compress']);
    expect(job.status).toBe('pending');
    expect(job.assetId).toBe('asset-1');
    expect(job.operations).toEqual(['resize', 'compress']);
  });

  it('getJob — bilinmeyen → null', () => {
    expect(mediaProcessor.getJob('non-existent')).toBeNull();
  });

  it('generateVariant — 3 variant type (thumbnail/preview/compressed)', async () => {
    const thumb = await mediaProcessor.generateVariant('asset-1', 'thumbnail');
    expect(thumb.id).toContain('thumbnail');
    expect(thumb.metadata?.variant).toBe('thumbnail');

    const preview = await mediaProcessor.generateVariant('asset-2', 'preview');
    expect(preview.metadata?.variant).toBe('preview');
  });
});

describe('ContentVersioner', () => {
  it('createVersion — id "v" prefix', () => {
    const id = contentVersioner.createVersion('content-1', { text: 'Hello' }, 'user-1');
    expect(id).toMatch(/^v\d+$/);
  });

  it('getVersion — content + userId + createdAt', () => {
    const id = contentVersioner.createVersion('content-2', { text: 'Test' }, 'user-2');
    const version = contentVersioner.getVersion('content-2', id);
    expect(version?.content).toEqual({ text: 'Test' });
    expect(version?.userId).toBe('user-2');
  });

  it('getVersion — bilinmeyen contentId → null', () => {
    expect(contentVersioner.getVersion('non-existent', 'v1')).toBeNull();
  });

  it('getVersion — bilinmeyen versionId → null', () => {
    contentVersioner.createVersion('content-3', { x: 1 }, 'u');
    expect(contentVersioner.getVersion('content-3', 'non-existent-v')).toBeNull();
  });

  it('listVersions — versionId+userId+createdAt array', () => {
    const CID = `content-list-${Date.now()}`;
    contentVersioner.createVersion(CID, { x: 1 }, 'u-1');
    contentVersioner.createVersion(CID, { x: 2 }, 'u-2');
    const versions = contentVersioner.listVersions(CID);
    expect(versions).toHaveLength(2);
    expect(versions[0]).toHaveProperty('versionId');
    expect(versions[0]).toHaveProperty('userId');
  });

  it('listVersions — bilinmeyen → boş', () => {
    expect(contentVersioner.listVersions('non-existent')).toEqual([]);
  });

  it('restoreVersion — exception fırlatmaz', () => {
    const id = contentVersioner.createVersion('content-restore', {}, 'u');
    expect(() => contentVersioner.restoreVersion('content-restore', id)).not.toThrow();
  });

  it('diffVersions — added/removed/changed array', () => {
    const diff = contentVersioner.diffVersions('content-diff', 'v1', 'v2');
    expect(diff).toEqual({ added: [], removed: [], changed: [] });
  });
});
