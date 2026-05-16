import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const {
  requireRoleMock,
  queryMock,
  transactionMock,
  invalidateEventMock,
  notifyEventSubmissionDecisionMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  queryMock: vi.fn(),
  transactionMock: vi.fn(),
  invalidateEventMock: vi.fn(),
  notifyEventSubmissionDecisionMock: vi.fn(),
}));

vi.mock('../auth', () => ({
  requireRole: requireRoleMock,
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  transaction: transactionMock,
}));

vi.mock('../cache/invalidation', () => ({
  invalidateEvent: invalidateEventMock,
}));

vi.mock('../email/submission-notifications', () => ({
  notifyEventSubmissionDecision: notifyEventSubmissionDecisionMock,
}));

import { GET, POST } from '../../pages/api/admin/events/submissions';

beforeEach(() => {
  requireRoleMock.mockReset();
  requireRoleMock.mockResolvedValue({ user: { id: 'admin-7', role: 'admin' } });
  queryMock.mockReset();
  transactionMock.mockReset();
  invalidateEventMock.mockReset();
  invalidateEventMock.mockResolvedValue(undefined);
  notifyEventSubmissionDecisionMock.mockReset();
  notifyEventSubmissionDecisionMock.mockResolvedValue(undefined);
});

describe('API /api/admin/events/submissions', () => {
  it('GET returns submissions + stats', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'sub-1', title: 'Festival', status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [{ pending: 1, approved: 1, rejected: 0, archived: 0 }] });

    const resp = await GET(createApiContext({
      url: 'http://localhost/api/admin/events/submissions?status=pending&page=1&limit=25',
    }));

    expect(resp.status).toBe(200);
    const data = await parseJson(resp);
    expect(data.data.submissions).toHaveLength(1);
    expect(data.data.stats.pending).toBe(1);
    expect(data.data.pagination.total).toBe(2);
  });

  it('approve submission → event created + decision email sent', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'sub-1',
        status: 'pending',
        title: 'Sira Gecesi',
        description: 'Uzun etkinlik aciklamasi ile dolu, takvimde yayinlanmaya hazir bir etkinlik.',
        category: 'kultur',
        location: 'Balikligol',
        start_date: '2026-06-01T18:00:00.000Z',
        end_date: null,
        image_url: null,
        organizer_name: 'Ayse',
        organizer_email: 'ayse@example.com',
        is_free: true,
      }],
    });

    transactionMock.mockImplementation(async (callback) => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{ id: 'event-1', slug: 'sira-gecesi', status: 'published', title: 'Sira Gecesi' }],
          })
          .mockResolvedValueOnce({
            rows: [{ id: 'sub-1', status: 'approved', approved_event_id: 'event-1' }],
          }),
      };
      return callback(client as any);
    });

    const resp = await POST(createApiContext({
      method: 'POST',
      body: { action: 'approve', id: 'sub-1', adminNote: 'Takvime alındı' },
    }));

    expect(resp.status).toBe(200);
    expect(invalidateEventMock).toHaveBeenCalledWith('event-1');
    expect(notifyEventSubmissionDecisionMock).toHaveBeenCalledWith(
      'ayse@example.com',
      'Ayse',
      'Sira Gecesi',
      true,
      'Takvime alındı',
    );
  });

  it('reject submission → admin note zorunlu + rejection email sent', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          id: 'sub-2',
          status: 'pending',
          title: 'Iptal Etkinlik',
          description: 'Test',
          category: 'genel',
          location: 'Urfa',
          start_date: '2026-06-02T10:00:00.000Z',
          end_date: null,
          image_url: null,
          organizer_name: 'Mehmet',
          organizer_email: 'mehmet@example.com',
          is_free: true,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'sub-2', status: 'rejected' }],
      });

    const resp = await POST(createApiContext({
      method: 'POST',
      body: { action: 'reject', id: 'sub-2', adminNote: 'Tarih bilgisi çakışıyor' },
    }));

    expect(resp.status).toBe(200);
    expect(notifyEventSubmissionDecisionMock).toHaveBeenCalledWith(
      'mehmet@example.com',
      'Mehmet',
      'Iptal Etkinlik',
      false,
      'Tarih bilgisi çakışıyor',
    );

    const data = await parseJson(resp);
    expect(data.data.submission.status).toBe('rejected');
  });
});
