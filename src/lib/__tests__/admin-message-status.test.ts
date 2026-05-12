/**
 * Unit Tests — normalizeTicketStatus helper
 *
 * Admin support ticket status legacy → canonical mapping:
 * - new/open → open
 * - read/in_progress → in_progress
 * - replied/resolved → resolved
 * - archived/closed → closed
 * - spam → spam
 *
 * Returns null for unknown status.
 */

import { describe, it, expect } from 'vitest';
import { normalizeTicketStatus } from '../admin/message-status';

describe('normalizeTicketStatus', () => {
  describe('legacy status migration', () => {
    it('new → open', () => {
      expect(normalizeTicketStatus('new')).toBe('open');
    });

    it('read → in_progress', () => {
      expect(normalizeTicketStatus('read')).toBe('in_progress');
    });

    it('replied → resolved', () => {
      expect(normalizeTicketStatus('replied')).toBe('resolved');
    });

    it('archived → closed', () => {
      expect(normalizeTicketStatus('archived')).toBe('closed');
    });
  });

  describe('canonical statuses (passthrough)', () => {
    it('open → open', () => {
      expect(normalizeTicketStatus('open')).toBe('open');
    });

    it('in_progress → in_progress', () => {
      expect(normalizeTicketStatus('in_progress')).toBe('in_progress');
    });

    it('resolved → resolved', () => {
      expect(normalizeTicketStatus('resolved')).toBe('resolved');
    });

    it('closed → closed', () => {
      expect(normalizeTicketStatus('closed')).toBe('closed');
    });

    it('spam → spam', () => {
      expect(normalizeTicketStatus('spam')).toBe('spam');
    });
  });

  describe('invalid inputs (return null)', () => {
    it('returns null for unknown status', () => {
      expect(normalizeTicketStatus('invalid')).toBeNull();
      expect(normalizeTicketStatus('UNKNOWN')).toBeNull();
    });

    it('case-sensitive: NEW (uppercase) → null', () => {
      // Mapping case-sensitive, NEW farklı 'new'den
      expect(normalizeTicketStatus('NEW')).toBeNull();
      expect(normalizeTicketStatus('Open')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(normalizeTicketStatus('')).toBeNull();
    });

    it('returns null for whitespace-only', () => {
      expect(normalizeTicketStatus('  ')).toBeNull();
      expect(normalizeTicketStatus('\t')).toBeNull();
    });

    it('returns null for SQL injection attempt', () => {
      expect(normalizeTicketStatus("open'; DROP TABLE tickets;--")).toBeNull();
    });
  });

  describe('canonical output validation', () => {
    it('all valid outputs are in canonical set', () => {
      const canonical = new Set(['open', 'in_progress', 'resolved', 'closed', 'spam']);
      const inputs = ['new', 'read', 'replied', 'archived', 'open', 'in_progress', 'resolved', 'closed', 'spam'];
      for (const input of inputs) {
        const result = normalizeTicketStatus(input);
        expect(result).not.toBeNull();
        expect(canonical.has(result as string)).toBe(true);
      }
    });
  });
});
