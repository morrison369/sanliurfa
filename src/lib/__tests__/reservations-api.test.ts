import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { queryMock, authenticateUserMock, sendEmailMock, loggerErrorMock, loggerWarnMock } =
  vi.hoisted(() => ({
    queryMock: vi.fn(),
    authenticateUserMock: vi.fn(),
    sendEmailMock: vi.fn(),
    loggerErrorMock: vi.fn(),
    loggerWarnMock: vi.fn(),
  }));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

vi.mock('../auth/middleware', () => ({
  authenticateUser: authenticateUserMock,
}));

vi.mock('../email', () => ({
  sendEmail: sendEmailMock,
}));

vi.mock('../logging', () => ({
  logger: {
    error: loggerErrorMock,
    warn: loggerWarnMock,
  },
}));

import { GET as LIST, POST } from '../../pages/api/reservations/index';
import { DELETE, PUT } from '../../pages/api/reservations/[id]';

function futureDate(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const adminAuth = { user: { id: 'admin-1', role: 'admin', email: 'admin@example.com' } };
const vendorAuth = { user: { id: 'vendor-1', role: 'vendor', email: 'vendor@example.com' } };
const userAuth = { user: { id: 'user-1', role: 'user', email: 'user@example.com' } };

describe('Reservations API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendEmailMock.mockResolvedValue({ success: true });
  });

  describe('GET /api/reservations', () => {
    it('requires authentication', async () => {
      authenticateUserMock.mockResolvedValueOnce(null);

      const response = await LIST(createApiContext({ url: 'http://localhost/api/reservations' }));
      const body = await parseJson(response);

      expect(response.status).toBe(401);
      expect(body?.type).toBe('/problems/reservations-list-unauthorized');
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('rejects regular users to prevent mass PII listing', async () => {
      authenticateUserMock.mockResolvedValueOnce(userAuth);

      const response = await LIST(createApiContext({ url: 'http://localhost/api/reservations' }));

      expect(response.status).toBe(403);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('admin can filter by place, status and date range', async () => {
      authenticateUserMock.mockResolvedValueOnce(adminAuth);
      queryMock.mockResolvedValueOnce({
        rows: [{ id: 'res-1', place_id: 'place-1', status: 'confirmed' }],
      });

      const response = await LIST(
        createApiContext({
          url: 'http://localhost/api/reservations?placeId=place-1&status=confirmed&dateFrom=2026-06-01&dateTo=2026-06-30',
        }),
      );
      const body = await parseJson(response);

      expect(response.status).toBe(200);
      expect(body?.data?.success).toBe(true);
      expect(queryMock.mock.calls[0]?.[0]).toContain('r.place_id');
      expect(queryMock.mock.calls[0]?.[0]).toContain('r.status');
      expect(queryMock.mock.calls[0]?.[0]).toContain('r.reservation_date >=');
      expect(queryMock.mock.calls[0]?.[1]).toEqual([
        'place-1',
        'confirmed',
        '2026-06-01',
        '2026-06-30',
      ]);
    });

    it('vendor list is constrained to owned places', async () => {
      authenticateUserMock.mockResolvedValueOnce(vendorAuth);
      queryMock.mockResolvedValueOnce({ rows: [{ id: 'res-1', place_id: 'place-1' }] });

      const response = await LIST(
        createApiContext({ url: 'http://localhost/api/reservations?placeId=place-1' }),
      );

      expect(response.status).toBe(200);
      expect(queryMock.mock.calls[0]?.[0]).toContain('p.owner_id');
      expect(queryMock.mock.calls[0]?.[1]).toEqual(['vendor-1', 'place-1']);
    });

    it('invalid status returns problem+json', async () => {
      authenticateUserMock.mockResolvedValueOnce(adminAuth);

      const response = await LIST(
        createApiContext({ url: 'http://localhost/api/reservations?status=approved' }),
      );
      const body = await parseJson(response);

      expect(response.status).toBe(400);
      expect(body?.type).toBe('/problems/reservations-status-invalid');
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/reservations', () => {
    it('validates required fields', async () => {
      const response = await POST(
        createApiContext({
          url: 'http://localhost/api/reservations',
          method: 'POST',
          body: { placeId: 'place-1' },
        }),
      );

      expect(response.status).toBe(400);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('validates phone format', async () => {
      const response = await POST(
        createApiContext({
          url: 'http://localhost/api/reservations',
          method: 'POST',
          body: {
            placeId: 'place-1',
            customerName: 'Ayse',
            customerPhone: 'abc',
            reservationDate: futureDate(),
            reservationTime: '19:00',
            partySize: 2,
          },
        }),
      );

      expect(response.status).toBe(400);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('returns 404 when place does not exist', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      const response = await POST(
        createApiContext({
          url: 'http://localhost/api/reservations',
          method: 'POST',
          body: {
            placeId: 'place-404',
            customerName: 'Ayse',
            customerPhone: '05551234567',
            reservationDate: futureDate(),
            reservationTime: '19:00',
            partySize: 2,
          },
        }),
      );

      expect(response.status).toBe(404);
    });

    it('creates reservation with atomic conflict guard', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ name: 'Test Mekan', accepts_reservations: true }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'res-1',
              confirmation_code: 'ABC123',
              reservation_date: futureDate(),
              reservation_time: '19:00',
              party_size: 2,
              status: 'pending',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ email: 'owner@example.com' }] });

      const response = await POST(
        createApiContext({
          url: 'http://localhost/api/reservations',
          method: 'POST',
          body: {
            placeId: 'place-1',
            customerName: 'Ayse',
            customerEmail: 'ayse@example.com',
            customerPhone: '05551234567',
            reservationDate: futureDate(),
            reservationTime: '19:00',
            partySize: 2,
            specialRequests: 'Pencere kenari',
          },
        }),
      );
      const body = await parseJson(response);

      expect(response.status).toBe(201);
      expect(body?.data?.reservation?.id).toBe('res-1');
      expect(queryMock.mock.calls[1]?.[0]).toContain('WHERE NOT EXISTS');
      expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com' }));
    });

    it('returns 409 for duplicate active reservation', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ name: 'Test Mekan', accepts_reservations: true }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await POST(
        createApiContext({
          url: 'http://localhost/api/reservations',
          method: 'POST',
          body: {
            placeId: 'place-1',
            customerName: 'Ayse',
            customerPhone: '05551234567',
            reservationDate: futureDate(),
            reservationTime: '19:00',
            partySize: 2,
          },
        }),
      );

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /api/reservations/:id', () => {
    it('rejects invalid status before update', async () => {
      authenticateUserMock.mockResolvedValueOnce(vendorAuth);
      queryMock.mockResolvedValueOnce({
        rows: [{ id: 'res-1', owner_id: 'vendor-1' }],
      });

      const response = await PUT(
        createApiContext({
          url: 'http://localhost/api/reservations/res-1',
          method: 'PUT',
          params: { id: 'res-1' },
          body: { status: 'approved' },
        }),
      );

      expect(response.status).toBe(400);
      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it('updates owned reservation and sends customer status email', async () => {
      authenticateUserMock.mockResolvedValueOnce(vendorAuth);
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 'res-1', owner_id: 'vendor-1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'res-1',
              customer_email: 'ayse@example.com',
              customer_name: 'Ayse',
              reservation_date: futureDate(),
              reservation_time: '19:00',
              party_size: 2,
              status: 'confirmed',
            },
          ],
        });

      const response = await PUT(
        createApiContext({
          url: 'http://localhost/api/reservations/res-1',
          method: 'PUT',
          params: { id: 'res-1' },
          body: { status: 'confirmed', tableNumber: 'A4' },
        }),
      );

      expect(response.status).toBe(200);
      expect(queryMock.mock.calls[1]?.[0]).toContain('confirmation_sent = true');
      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ayse@example.com' }),
      );
    });
  });

  describe('DELETE /api/reservations/:id', () => {
    it('requires admin role', async () => {
      authenticateUserMock.mockResolvedValueOnce(vendorAuth);

      const response = await DELETE(
        createApiContext({
          url: 'http://localhost/api/reservations/res-1',
          method: 'DELETE',
          params: { id: 'res-1' },
        }),
      );

      expect(response.status).toBe(401);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('admin delete returns success', async () => {
      authenticateUserMock.mockResolvedValueOnce(adminAuth);
      queryMock.mockResolvedValueOnce({ rows: [{ id: 'res-1' }] });

      const response = await DELETE(
        createApiContext({
          url: 'http://localhost/api/reservations/res-1',
          method: 'DELETE',
          params: { id: 'res-1' },
        }),
      );

      expect(response.status).toBe(200);
      expect(queryMock.mock.calls[0]?.[0]).toContain('DELETE FROM reservations');
    });
  });
});
