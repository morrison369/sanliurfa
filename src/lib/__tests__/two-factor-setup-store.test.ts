/**
 * Unit Tests — two-factor-setup-store
 *
 * In-memory ephemeral store for 2FA setup flow.
 * - User starts 2FA setup → secret stored with TTL (default 10 min)
 * - User confirms with TOTP code → secret retrieved + finalized
 * - On expiry/cancel → secret deleted (forget)
 *
 * Module-level Map state, vi.useFakeTimers() ile TTL test'leri deterministic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  setTwoFactorSetupSecret,
  getTwoFactorSetupSecret,
  deleteTwoFactorSetupSecret,
} from '../two-factor-setup-store';

describe('two-factor-setup-store', () => {
  beforeEach(() => {
    // Module-level state cleanup — silmek için her test öncesi delete
    deleteTwoFactorSetupSecret('user-1');
    deleteTwoFactorSetupSecret('user-2');
    deleteTwoFactorSetupSecret('expired-user');
  });

  describe('set + get', () => {
    it('stores secret and retrieves it', () => {
      setTwoFactorSetupSecret('user-1', 'JBSWY3DPEHPK3PXP');
      expect(getTwoFactorSetupSecret('user-1')).toBe('JBSWY3DPEHPK3PXP');
    });

    it('returns null when user has no setup secret', () => {
      expect(getTwoFactorSetupSecret('user-no-setup')).toBeNull();
    });

    it('overwrites previous secret for same user', () => {
      setTwoFactorSetupSecret('user-1', 'SECRET_A');
      setTwoFactorSetupSecret('user-1', 'SECRET_B');
      expect(getTwoFactorSetupSecret('user-1')).toBe('SECRET_B');
    });

    it('isolated per user', () => {
      setTwoFactorSetupSecret('user-1', 'SECRET_USER1');
      setTwoFactorSetupSecret('user-2', 'SECRET_USER2');
      expect(getTwoFactorSetupSecret('user-1')).toBe('SECRET_USER1');
      expect(getTwoFactorSetupSecret('user-2')).toBe('SECRET_USER2');
    });
  });

  describe('TTL expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('default TTL is 600 seconds (10 minutes)', () => {
      setTwoFactorSetupSecret('user-1', 'SECRET');
      vi.advanceTimersByTime(599 * 1000); // 599s
      expect(getTwoFactorSetupSecret('user-1')).toBe('SECRET');
    });

    it('returns null after default TTL (600s) elapsed', () => {
      setTwoFactorSetupSecret('user-1', 'SECRET');
      vi.advanceTimersByTime(601 * 1000); // 601s
      expect(getTwoFactorSetupSecret('user-1')).toBeNull();
    });

    it('respects custom TTL (60 seconds)', () => {
      setTwoFactorSetupSecret('user-1', 'SECRET', 60);
      vi.advanceTimersByTime(59 * 1000);
      expect(getTwoFactorSetupSecret('user-1')).toBe('SECRET');
      vi.advanceTimersByTime(2 * 1000); // 61s total
      expect(getTwoFactorSetupSecret('user-1')).toBeNull();
    });

    it('expiry deletes record (subsequent get returns null without re-check)', () => {
      setTwoFactorSetupSecret('user-1', 'SECRET', 60);
      vi.advanceTimersByTime(61 * 1000);
      expect(getTwoFactorSetupSecret('user-1')).toBeNull();
      // After auto-delete, store should not have the entry — set new
      setTwoFactorSetupSecret('user-1', 'NEW_SECRET', 60);
      expect(getTwoFactorSetupSecret('user-1')).toBe('NEW_SECRET');
    });

    it('TTL boundary: exact TTL second behavior (uses <= comparison)', () => {
      setTwoFactorSetupSecret('user-1', 'SECRET', 1);
      vi.advanceTimersByTime(1000); // exactly 1000 ms — expiresAt is reached
      // expiresAt <= Date.now() → returns null (≤ semantic)
      expect(getTwoFactorSetupSecret('user-1')).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes stored secret immediately', () => {
      setTwoFactorSetupSecret('user-1', 'SECRET');
      expect(getTwoFactorSetupSecret('user-1')).toBe('SECRET');
      deleteTwoFactorSetupSecret('user-1');
      expect(getTwoFactorSetupSecret('user-1')).toBeNull();
    });

    it('idempotent — does not throw on missing user', () => {
      expect(() => deleteTwoFactorSetupSecret('non-existent-user')).not.toThrow();
    });

    it('does not affect other users (isolation)', () => {
      setTwoFactorSetupSecret('user-1', 'A');
      setTwoFactorSetupSecret('user-2', 'B');
      deleteTwoFactorSetupSecret('user-1');
      expect(getTwoFactorSetupSecret('user-1')).toBeNull();
      expect(getTwoFactorSetupSecret('user-2')).toBe('B');
    });
  });

  describe('use case scenarios', () => {
    it('flow: setup → verify → finalize (delete)', () => {
      const userId = 'user-1';
      const secret = 'JBSWY3DPEHPK3PXP';
      // Step 1: User starts 2FA setup, secret stored
      setTwoFactorSetupSecret(userId, secret);
      // Step 2: User scans QR, enters TOTP — server retrieves secret
      const retrieved = getTwoFactorSetupSecret(userId);
      expect(retrieved).toBe(secret);
      // Step 3: After successful verification, secret stored to user table → ephemeral deleted
      deleteTwoFactorSetupSecret(userId);
      expect(getTwoFactorSetupSecret(userId)).toBeNull();
    });

    it('flow: setup → user abandons → TTL expires → secret gone', () => {
      vi.useFakeTimers();
      try {
        setTwoFactorSetupSecret('user-1', 'SECRET');
        // User leaves browser, never confirms
        vi.advanceTimersByTime(700 * 1000); // 700s — past 10min TTL
        expect(getTwoFactorSetupSecret('user-1')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
