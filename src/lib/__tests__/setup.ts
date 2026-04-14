import { vi } from 'vitest';

// Redis mock for tests
const mockRedisData = new Map<string, any>();
const mockRedisLists = new Map<string, string[]>();

vi.mock('../cache', async () => {
  return {
    getRedisClient: vi.fn().mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      setEx: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      lPush: vi.fn().mockResolvedValue(1),
      lTrim: vi.fn().mockResolvedValue('OK'),
      keys: vi.fn().mockResolvedValue([]),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(true),
      isOpen: true,
    }),
    isRedisAvailable: vi.fn().mockReturnValue(true),
    prefixKey: vi.fn((key: string) => `sanliurfa:${key}`),
    getCache: vi.fn().mockResolvedValue(null),
    // Fix: getCache should return string or null for JSON.parse compatibility
    _getCacheRaw: vi.fn().mockResolvedValue(null),
    setCache: vi.fn().mockResolvedValue(undefined),
    deleteCache: vi.fn().mockResolvedValue(undefined),
    deleteCachePattern: vi.fn().mockResolvedValue(undefined),
    checkRateLimit: vi.fn().mockResolvedValue(true),
    // Direct redis client mock (sync for backwards compatibility)
    redis: {
      setex: vi.fn().mockReturnValue('OK'),
      lpush: vi.fn().mockReturnValue(1),
      ltrim: vi.fn().mockReturnValue('OK'),
      get: vi.fn().mockReturnValue(null),
      del: vi.fn().mockReturnValue(1),
      expire: vi.fn().mockReturnValue(1),
      lrange: vi.fn().mockReturnValue([]),
    }
  };
});

// Logger mock
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}));
