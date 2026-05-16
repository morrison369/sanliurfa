/**
 * Security Test — Vendor-Only IDOR Pattern
 *
 * 2026-04-25 audit'inde 7 endpoint'te `if (role === 'vendor')` only check
 * kullanılıyordu — user/moderator role'ler 403 yerine erişim alıyordu (IDOR).
 *
 * CLAUDE.md "SECURITY HARD RULES" #11: 3-yol switch zorunlu (admin > vendor > 403).
 *
 * Bu test endpoint'lerin user role'ünü 403 ile reddettiğini doğrular.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/postgres', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryMany: vi.fn(),
}));

vi.mock('../../lib/auth/middleware', () => ({
  authenticateUser: vi.fn(),
}));

vi.mock('../../lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, tier: 'dev-log' }),
}));

vi.mock('../../lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), setRequestId: vi.fn(), logMutation: vi.fn() },
}));

import { authenticateUser } from '../../lib/auth/middleware';

describe('Vendor-Only IDOR Pattern (3-yol switch enforcement)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reservations/[id] GET (PII leak prevention)', () => {
    it('regular user role → 403 (NOT 200)', async () => {
      const { query } = await import('../../lib/postgres');
      vi.mocked(authenticateUser).mockResolvedValue({
        user: { id: 'user-1', role: 'user', email: 'u@x.com' },
        placeId: null,
      } as any);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{
          id: 'res-1', place_id: 'place-99',
          customer_email: 'leak@example.com', customer_phone: '+905551234567',
        }],
        rowCount: 1, command: 'SELECT',
      } as any);

      const { GET } = await import('../../pages/api/reservations/[id]');
      const response = await GET({
        request: new Request('http://localhost/api/reservations/res-1'),
        params: { id: 'res-1' },
      } as any);

      expect(response.status).toBe(403);
      const body = await response.json();
      // PII fields MUST NOT appear in response body
      expect(JSON.stringify(body)).not.toContain('leak@example.com');
      expect(JSON.stringify(body)).not.toContain('+905551234567');
    });

    it('moderator role → 403 (moderator is not admin/vendor)', async () => {
      const { query } = await import('../../lib/postgres');
      vi.mocked(authenticateUser).mockResolvedValue({
        user: { id: 'mod-1', role: 'moderator', email: 'm@x.com' },
        placeId: null,
      } as any);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'res-1', place_id: 'place-99', customer_email: 'x@y.com' }],
        rowCount: 1, command: 'SELECT',
      } as any);

      const { GET } = await import('../../pages/api/reservations/[id]');
      const response = await GET({
        request: new Request('http://localhost/api/reservations/res-1'),
        params: { id: 'res-1' },
      } as any);

      expect(response.status).toBe(403);
    });

    it('admin role → 200 (full access)', async () => {
      const { query } = await import('../../lib/postgres');
      vi.mocked(authenticateUser).mockResolvedValue({
        user: { id: 'admin-1', role: 'admin', email: 'a@x.com' },
        placeId: null,
      } as any);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'res-1', place_id: 'place-99', customer_email: 'ok@x.com' }],
        rowCount: 1, command: 'SELECT',
      } as any);

      const { GET } = await import('../../pages/api/reservations/[id]');
      const response = await GET({
        request: new Request('http://localhost/api/reservations/res-1'),
        params: { id: 'res-1' },
      } as any);

      expect(response.status).toBe(200);
    });

    it('vendor role with matching placeId → 200 (own place)', async () => {
      const { query } = await import('../../lib/postgres');
      vi.mocked(authenticateUser).mockResolvedValue({
        user: { id: 'vendor-1', role: 'vendor', email: 'v@x.com' },
        placeId: 'place-99',
      } as any);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'res-1', place_id: 'place-99', owner_id: 'vendor-1', customer_email: 'ok@x.com' }],
        rowCount: 1, command: 'SELECT',
      } as any);

      const { GET } = await import('../../pages/api/reservations/[id]');
      const response = await GET({
        request: new Request('http://localhost/api/reservations/res-1'),
        params: { id: 'res-1' },
      } as any);

      expect(response.status).toBe(200);
    });

    it('vendor role with mismatched placeId → 403 (other vendor place)', async () => {
      const { query } = await import('../../lib/postgres');
      vi.mocked(authenticateUser).mockResolvedValue({
        user: { id: 'vendor-2', role: 'vendor', email: 'v2@x.com' },
        placeId: 'place-OTHER',
      } as any);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'res-1', place_id: 'place-99', owner_id: 'vendor-1', customer_email: 'leak@x.com' }],
        rowCount: 1, command: 'SELECT',
      } as any);

      const { GET } = await import('../../pages/api/reservations/[id]');
      const response = await GET({
        request: new Request('http://localhost/api/reservations/res-1'),
        params: { id: 'res-1' },
      } as any);

      expect(response.status).toBe(403);
    });
  });

  describe('reservations/index GET (mass PII leak prevention)', () => {
    it('regular user role → 403 (cannot list ALL reservations)', async () => {
      vi.mocked(authenticateUser).mockResolvedValue({
        user: { id: 'user-1', role: 'user', email: 'u@x.com' },
        placeId: null,
      } as any);

      const { GET } = await import('../../pages/api/reservations/index');
      const response = await GET({
        request: new Request('http://localhost/api/reservations'),
      } as any);

      expect(response.status).toBe(403);
    });

    it('moderator role → 403', async () => {
      vi.mocked(authenticateUser).mockResolvedValue({
        user: { id: 'mod-1', role: 'moderator', email: 'm@x.com' },
        placeId: null,
      } as any);

      const { GET } = await import('../../pages/api/reservations/index');
      const response = await GET({
        request: new Request('http://localhost/api/reservations'),
      } as any);

      expect(response.status).toBe(403);
    });

    it('vendor without placeId → 200 and owner filter applied', async () => {
      const { query } = await import('../../lib/postgres');
      vi.mocked(authenticateUser).mockResolvedValue({
        user: { id: 'vendor-1', role: 'vendor', email: 'v@x.com' },
        placeId: null,
      } as any);
      vi.mocked(query).mockResolvedValueOnce({
        rows: [{ id: 'res-1', place_id: 'place-99', customer_email: 'ok@x.com' }],
        rowCount: 1, command: 'SELECT',
      } as any);

      const { GET } = await import('../../pages/api/reservations/index');
      const response = await GET({
        request: new Request('http://localhost/api/reservations'),
      } as any);

      expect(response.status).toBe(200);
      expect(vi.mocked(query).mock.calls[0]?.[0]).toContain('p.owner_id');
    });
  });
});
