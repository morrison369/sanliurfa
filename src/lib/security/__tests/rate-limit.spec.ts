import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit, rateLimitByUser } from '../rate-limit';
import { getCache, setCache } from '../../cache';

vi.mock('../../cache');

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rateLimit', () => {
    it('should allow requests under limit', async () => {
      vi.mocked(getCache).mockResolvedValue(null);
      vi.mocked(setCache).mockResolvedValue(undefined);

      const context = {
        request: new Request('http://localhost:4321/api/test'),
      } as any;

      const result = await rateLimit(context, { windowMs: 60000, maxRequests: 10 });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it('should block requests over limit', async () => {
      const now = Date.now();
      const requests = Array(10).fill(now);
      
      vi.mocked(getCache).mockResolvedValue({ requests });
      vi.mocked(setCache).mockResolvedValue(undefined);

      const context = {
        request: new Request('http://localhost:4321/api/test'),
      } as any;

      const result = await rateLimit(context, { windowMs: 60000, maxRequests: 10 });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use x-forwarded-for header for IP', async () => {
      vi.mocked(getCache).mockResolvedValue(null);
      vi.mocked(setCache).mockResolvedValue(undefined);

      const context = {
        request: new Request('http://localhost:4321/api/test', {
          headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
        }),
      } as any;

      await rateLimit(context, { windowMs: 60000, maxRequests: 10 });

      expect(setCache).toHaveBeenCalled();
      const cacheKey = vi.mocked(setCache).mock.calls[0][0] as string;
      expect(cacheKey).toContain('192.168.1.1');
    });
  });

  describe('rateLimitByUser', () => {
    it('should allow requests under user limit', async () => {
      vi.mocked(getCache).mockResolvedValue(null);
      vi.mocked(setCache).mockResolvedValue(undefined);

      const result = await rateLimitByUser('user-123', { windowMs: 60000, maxRequests: 60 });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });

    it('should block requests over user limit', async () => {
      const now = Date.now();
      const requests = Array(60).fill(now);
      
      vi.mocked(getCache).mockResolvedValue({ requests });
      vi.mocked(setCache).mockResolvedValue(undefined);

      const result = await rateLimitByUser('user-123', { windowMs: 60000, maxRequests: 60 });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});
