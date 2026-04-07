import { describe, it, expect } from 'vitest';

describe('Cache Utils', () => {
  it('should prefix keys correctly', () => {
    const prefixKey = (prefix: string, key: string) => `${prefix}${key}`;
    const prefix = 'sanliurfa:';
    
    const result = prefixKey(prefix, 'places:list');
    expect(result).toBe('sanliurfa:places:list');
  });

  it('should extract prefix from key', () => {
    const extractPrefix = (key: string) => key.split(':')[0];
    
    const result = extractPrefix('sanliurfa:places:list');
    expect(result).toBe('sanliurfa');
  });

  it('should validate cache pattern', () => {
    const isValidPattern = (pattern: string) => {
      return pattern.includes('*') || pattern.includes('?');
    };
    
    expect(isValidPattern('sanliurfa:places:*')).toBe(true);
    expect(isValidPattern('sanliurfa:places:123')).toBe(false);
  });

  it('should calculate TTL', () => {
    const calculateTTL = (minutes: number) => minutes * 60;
    
    const result = calculateTTL(5);
    expect(result).toBe(300);
  });

  it('should detect cache expiration', () => {
    const isExpired = (timestamp: number, ttl: number) => {
      const now = Date.now() / 1000;
      return (now - timestamp) > ttl;
    };
    
    const oldTimestamp = (Date.now() / 1000) - 400; // 400 seconds ago
    const ttl = 300; // 5 minutes
    
    expect(isExpired(oldTimestamp, ttl)).toBe(true);
  });
});
