import { describe, it, expect } from 'vitest';

// Test utility functions
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

function calculateRatingAverage(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

describe('Utility Functions', () => {
  describe('slugify', () => {
    it('should convert text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Şanlıurfa Merkez')).toBe('sanlurfa-merkez');
      expect(slugify('  Test  ')).toBe('test');
    });

    it('should handle special characters', () => {
      expect(slugify('Test@#$%')).toBe('test');
      expect(slugify('a-b_c')).toBe('a-b-c');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
      expect(truncate('Hi', 10)).toBe('Hi');
    });
  });

  describe('calculateRatingAverage', () => {
    it('should calculate average rating', () => {
      expect(calculateRatingAverage([5, 4, 5, 3, 4])).toBe(4.2);
      expect(calculateRatingAverage([])).toBe(0);
      expect(calculateRatingAverage([5])).toBe(5);
    });
  });
});
