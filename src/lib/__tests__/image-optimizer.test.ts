import { describe, it, expect } from 'vitest';
import {
  generateCacheKey,
  getOptimalFormat,
  parseSize,
  calculateDimensions,
  validateImageSource,
  getContentType,
  createImageUrl,
  IMAGE_SIZES,
} from '../image-optimizer';

describe('Image Optimizer', () => {
  describe('generateCacheKey', () => {
    it('should generate consistent cache key', () => {
      const key1 = generateCacheKey('test.jpg', { width: 100, format: 'webp' });
      const key2 = generateCacheKey('test.jpg', { width: 100, format: 'webp' });
      expect(key1).toBe(key2);
    });

    it('should include all parameters', () => {
      const key = generateCacheKey('test.jpg', { 
        width: 100, 
        height: 200, 
        format: 'webp',
        quality: 80 
      });
      expect(key).toContain('w=100');
      expect(key).toContain('h=200');
      expect(key).toContain('f=webp');
      expect(key).toContain('q=80');
    });
  });

  describe('getOptimalFormat', () => {
    it('should return avif if supported', () => {
      const format = getOptimalFormat('image/webp, image/avif');
      expect(format).toBe('avif');
    });

    it('should return webp if supported', () => {
      const format = getOptimalFormat('image/webp');
      expect(format).toBe('webp');
    });

    it('should fallback to jpeg', () => {
      const format = getOptimalFormat('image/png');
      expect(format).toBe('jpeg');
    });
  });

  describe('parseSize', () => {
    it('should parse preset sizes', () => {
      expect(parseSize('thumbnail')).toEqual(IMAGE_SIZES.thumbnail);
      expect(parseSize('medium')).toEqual(IMAGE_SIZES.medium);
    });

    it('should parse custom sizes', () => {
      expect(parseSize('800x600')).toEqual({ width: 800, height: 600 });
    });

    it('should return null for invalid size', () => {
      expect(parseSize('invalid')).toBeNull();
    });
  });

  describe('calculateDimensions', () => {
    it('should maintain aspect ratio when only width provided', () => {
      const dims = calculateDimensions(800, 600, 400, undefined);
      expect(dims).toEqual({ width: 400, height: 300 });
    });

    it('should maintain aspect ratio when only height provided', () => {
      const dims = calculateDimensions(800, 600, undefined, 300);
      expect(dims).toEqual({ width: 400, height: 300 });
    });

    it('should use exact dimensions for fill', () => {
      const dims = calculateDimensions(800, 600, 400, 400, 'fill');
      expect(dims).toEqual({ width: 400, height: 400 });
    });

    it('should return original if no dimensions provided', () => {
      const dims = calculateDimensions(800, 600, undefined, undefined);
      expect(dims).toEqual({ width: 800, height: 600 });
    });
  });

  describe('validateImageSource', () => {
    it('should validate allowed extensions', () => {
      expect(validateImageSource('photo.jpg')).toBe(true);
      expect(validateImageSource('photo.png')).toBe(true);
      expect(validateImageSource('photo.webp')).toBe(true);
    });

    it('should reject path traversal', () => {
      expect(validateImageSource('../etc/passwd')).toBe(false);
      expect(validateImageSource('/etc/passwd')).toBe(false);
    });
  });

  describe('getContentType', () => {
    it('should return correct content types', () => {
      expect(getContentType('webp')).toBe('image/webp');
      expect(getContentType('jpeg')).toBe('image/jpeg');
      expect(getContentType('png')).toBe('image/png');
      expect(getContentType('avif')).toBe('image/avif');
    });

    it('should fallback to jpeg', () => {
      expect(getContentType('unknown' as any)).toBe('image/jpeg');
    });
  });

  describe('createImageUrl', () => {
    it('should create URL with parameters', () => {
      const url = createImageUrl('photo.jpg', { width: 300, format: 'webp' });
      expect(url).toBe('/api/image/photo.jpg?w=300&f=webp');
    });

    it('should handle multiple parameters', () => {
      const url = createImageUrl('photo.jpg', { 
        width: 300, 
        height: 200, 
        quality: 85 
      });
      expect(url).toContain('w=300');
      expect(url).toContain('h=200');
      expect(url).toContain('q=85');
    });
  });
});
