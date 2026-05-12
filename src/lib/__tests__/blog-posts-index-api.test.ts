/**
 * API Contract Tests - GET + POST /api/blog/posts
 *
 * GET (public):
 * - status allowlist (published default / draft / all) → fallback published
 * - category + categoryId aliases (substring 100 DoS guard)
 * - safeIntParam limit 1..100 default 20 + offset
 * - page calculated from offset/limit
 * - getBlogPosts called with normalized params
 *
 * POST (admin only):
 * - HARD RULE #52: locals.user.role !== 'admin' → 403
 * - Validation: title (3-255 chars) + content (10-100000 chars)
 * - generateSlug from seoTitle || title
 * - tags string CSV split + trim + filter empty
 * - status default 'draft' + author_id from session
 *
 * vi.hoisted - blog + seo-utils + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext } from './helpers/api-test-helpers';

const { getBlogPostsMock, createBlogPostMock, generateSlugMock } = vi.hoisted(() => ({
  getBlogPostsMock: vi.fn(),
  createBlogPostMock: vi.fn(),
  generateSlugMock: vi.fn(),
}));

vi.mock('../blog', () => ({
  getBlogPosts: getBlogPostsMock,
  createBlogPost: createBlogPostMock,
}));

vi.mock('../seo-utils', () => ({
  generateSlug: generateSlugMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  getBlogPostsMock.mockReset();
  getBlogPostsMock.mockResolvedValue({ posts: [], total: 0 });
  createBlogPostMock.mockReset();
  createBlogPostMock.mockResolvedValue({ id: 'post-1' });
  generateSlugMock.mockReset();
  generateSlugMock.mockImplementation((s: string) => s.toLowerCase().replace(/\s+/g, '-'));
});

import { GET, POST } from '../../pages/api/blog/posts';

const ADMIN = { id: 'admin-1', email: 'a@t.com', role: 'admin' };
const USER = { id: 'user-1', email: 'u@t.com', role: 'user' };

const validBody = {
  title: 'My Blog Post',
  content: 'This is the body content with sufficient length',
};

describe('GET /api/blog/posts', () => {
  it('default status="published" + safeIntParam defaults', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/posts' });
    await GET(ctx);
    const call = getBlogPostsMock.mock.calls[0][0];
    expect(call.status).toBe('published');
    expect(call.limit).toBe(20);
    expect(call.page).toBe(1);
  });

  it('invalid status → fallback "published"', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/posts?status=secret' });
    await GET(ctx);
    expect(getBlogPostsMock.mock.calls[0][0].status).toBe('published');
  });

  it('status=draft passes through', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/posts?status=draft' });
    await GET(ctx);
    expect(getBlogPostsMock.mock.calls[0][0].status).toBe('draft');
  });

  it('status=all passes through', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/posts?status=all' });
    await GET(ctx);
    expect(getBlogPostsMock.mock.calls[0][0].status).toBe('all');
  });

  it('category substring(100) DoS guard', async () => {
    const longCat = 'a'.repeat(150);
    const ctx = createApiContext({ url: `http://localhost/api/blog/posts?category=${longCat}` });
    await GET(ctx);
    expect(getBlogPostsMock.mock.calls[0][0].category.length).toBe(100);
  });

  it('categoryId alias accepted (when no category)', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/posts?categoryId=42' });
    await GET(ctx);
    expect(getBlogPostsMock.mock.calls[0][0].category).toBe('42');
  });

  it('page calculated from offset/limit (offset 40 / limit 20 → page 3)', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/posts?offset=40&limit=20' });
    await GET(ctx);
    expect(getBlogPostsMock.mock.calls[0][0].page).toBe(3);
  });

  it('safeIntParam limit clamp max 100', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/blog/posts?limit=999' });
    await GET(ctx);
    expect(getBlogPostsMock.mock.calls[0][0].limit).toBe(100);
  });
});

describe('POST /api/blog/posts', () => {
  it('HARD RULE #52: non-admin → 403', async () => {
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: { user: USER } });
    const resp = await POST(ctx);
    expect(resp.status).toBe(403);
    expect(createBlogPostMock).not.toHaveBeenCalled();
  });

  it('no auth → 403', async () => {
    const ctx = createApiContext({ method: 'POST', body: validBody, locals: {} });
    const resp = await POST(ctx);
    expect(resp.status).toBe(403);
  });

  it('title too short (<3 chars) → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, title: 'X' },
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('content too short (<10 chars) → 422', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, content: 'short' },
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(422);
  });

  it('admin success → 201 + createBlogPost called with author_id from session', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: validBody,
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(201);
    const call = createBlogPostMock.mock.calls[0][0];
    expect(call.title).toBe('My Blog Post');
    expect(call.author_id).toBe('admin-1');
    expect(call.status).toBe('draft'); // default
  });

  it('generateSlug from seoTitle when provided (else title)', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, seoTitle: 'SEO Optimized Title' },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    expect(generateSlugMock).toHaveBeenCalledWith('SEO Optimized Title');
  });

  it('tags CSV split + trim + filter empty', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, tags: 'tech, , news,  food  ' },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    const call = createBlogPostMock.mock.calls[0][0];
    expect(call.tags).toEqual(['tech', 'news', 'food']);
  });

  it('excerpt fallback chain (excerpt → seoDescription → content.slice(0,180))', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, seoDescription: 'SEO desc fallback' },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    expect(createBlogPostMock.mock.calls[0][0].excerpt).toBe('SEO desc fallback');
  });

  it('cover_image from featuredImage OR thumbnail', async () => {
    const ctx = createApiContext({
      method: 'POST',
      body: { ...validBody, thumbnail: '/img/thumb.jpg' },
      locals: { user: ADMIN },
    });
    await POST(ctx);
    expect(createBlogPostMock.mock.calls[0][0].cover_image).toBe('/img/thumb.jpg');
  });

  it('createBlogPost throws → 500', async () => {
    createBlogPostMock.mockRejectedValueOnce(new Error('DB error'));
    const ctx = createApiContext({
      method: 'POST',
      body: validBody,
      locals: { user: ADMIN },
    });
    const resp = await POST(ctx);
    expect(resp.status).toBe(500);
  });
});
