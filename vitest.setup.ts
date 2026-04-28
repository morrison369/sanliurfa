import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test utilities
declare global {
  var testUtils: {
    mockUser: () => { id: string; email: string; role: string };
    mockPlace: () => { id: string; name: string; slug: string };
  };
}

global.testUtils = {
  mockUser: () => ({
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
  }),
  mockPlace: () => ({
    id: 'place-123',
    name: 'Test Mekan',
    slug: 'test-mekan',
  }),
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
