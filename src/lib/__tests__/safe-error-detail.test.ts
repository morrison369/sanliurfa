import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { safeErrorDetail } from '../api';

describe('safeErrorDetail', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;
  });

  describe('production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('returns fallback for Error instance', () => {
      const err = new Error('duplicate key value violates unique constraint "users_email_key"');
      expect(safeErrorDetail(err, 'Generic error')).toBe('Generic error');
    });

    it('returns fallback for string error', () => {
      expect(safeErrorDetail('connection refused at 10.0.0.5:5432', 'Server error')).toBe('Server error');
    });

    it('returns fallback for unknown error type', () => {
      expect(safeErrorDetail({ code: 'EHOSTUNREACH' }, 'Network error')).toBe('Network error');
    });

    it('returns fallback for null/undefined', () => {
      expect(safeErrorDetail(null, 'default')).toBe('default');
      expect(safeErrorDetail(undefined, 'default')).toBe('default');
    });

    it('case-insensitive production matching', () => {
      process.env.NODE_ENV = 'PRODUCTION';
      const err = new Error('sensitive: /home/app/secrets.txt');
      expect(safeErrorDetail(err, 'Generic')).toBe('Generic');
    });
  });

  describe('non-production (dev/test)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('returns Error.message in dev', () => {
      const err = new Error('column "foo" does not exist');
      expect(safeErrorDetail(err, 'fallback')).toBe('column "foo" does not exist');
    });

    it('returns string error directly in dev', () => {
      expect(safeErrorDetail('explicit error string', 'fallback')).toBe('explicit error string');
    });

    it('falls back when Error has empty message', () => {
      const err = new Error('');
      expect(safeErrorDetail(err, 'fallback')).toBe('fallback');
    });

    it('falls back for non-Error non-string', () => {
      expect(safeErrorDetail({ weird: 'object' }, 'fallback')).toBe('fallback');
    });

    it('returns fallback for null/undefined in dev too', () => {
      expect(safeErrorDetail(null, 'default')).toBe('default');
      expect(safeErrorDetail(undefined, 'default')).toBe('default');
    });
  });

  describe('NODE_ENV unset', () => {
    beforeEach(() => {
      delete process.env.NODE_ENV;
    });

    it('treats unset as non-production (dev-friendly default)', () => {
      const err = new Error('detailed dev error');
      expect(safeErrorDetail(err, 'fallback')).toBe('detailed dev error');
    });
  });
});
