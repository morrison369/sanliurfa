/**
 * Test Fixtures
 * Mock data for unit tests
 */

import { randomUUID } from 'crypto';

export function createTestUser(overrides: Partial<{
  id: string;
  email: string;
  password: string;
  full_name: string;
  is_verified: boolean;
  is_admin: boolean;
}> = {}) {
  const timestamp = Date.now();
  return {
    id: overrides.id || randomUUID(),
    email: overrides.email || `test-${timestamp}@example.com`,
    password: overrides.password || 'TestPassword123!',
    full_name: overrides.full_name || 'Test User',
    is_verified: overrides.is_verified ?? true,
    is_admin: overrides.is_admin ?? false,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export function createTestPlace(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
}> = {}) {
  const timestamp = Date.now();
  return {
    id: overrides.id || randomUUID(),
    name: overrides.name || `Test Place ${timestamp}`,
    slug: overrides.slug || `test-place-${timestamp}`,
    description: overrides.description || 'A test place description',
    category: overrides.category || 'tarihi-yerler',
    latitude: overrides.latitude || 37.1591,
    longitude: overrides.longitude || 38.7969,
    address: 'Test Address, Şanlıurfa',
    rating: 4.5,
    review_count: 10,
    images: [],
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export function createTestBlogPost(overrides: Partial<{
  id: string;
  title: string;
  slug: string;
  content: string;
  author_id: string;
  status: string;
}> = {}) {
  const timestamp = Date.now();
  return {
    id: overrides.id || randomUUID(),
    title: overrides.title || `Test Post ${timestamp}`,
    slug: overrides.slug || `test-post-${timestamp}`,
    excerpt: 'Test excerpt',
    content: overrides.content || '<p>Test content</p>',
    author_id: overrides.author_id || randomUUID(),
    status: overrides.status || 'published',
    cover_image: null,
    published_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export function createTestReview(overrides: Partial<{
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  comment: string;
}> = {}) {
  return {
    id: overrides.id || randomUUID(),
    place_id: overrides.place_id || randomUUID(),
    user_id: overrides.user_id || randomUUID(),
    rating: overrides.rating || 5,
    comment: overrides.comment || 'Great place!',
    created_at: new Date(),
  };
}

export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}) {
  return new Request(options.url || 'http://localhost:4321/api/test', {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export function createMockContext(options: {
  user?: { id: string; is_admin: boolean } | null;
  request?: Request;
} = {}) {
  return {
    locals: {
      user: options.user || null,
    },
    request: options.request || createMockRequest(),
    url: new URL(options.request?.url || 'http://localhost:4321'),
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
  } as any;
}
