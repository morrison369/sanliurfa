import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const {
  requireRoleMock,
  queryMock,
  recordPlaceLifecycleEventMock,
  invalidatePlaceMock,
  notifyPlaceSubmissionDecisionMock,
  assertPlaceStatusTransitionMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  queryMock: vi.fn(),
  recordPlaceLifecycleEventMock: vi.fn(),
  invalidatePlaceMock: vi.fn(),
  notifyPlaceSubmissionDecisionMock: vi.fn(),
  assertPlaceStatusTransitionMock: vi.fn(() => ({ ok: true })),
}));

vi.mock('../auth', () => ({
  requireRole: requireRoleMock,
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

vi.mock('../place/lifecycle', () => ({
  assertPlaceStatusTransition: assertPlaceStatusTransitionMock,
}));

vi.mock('../place/lifecycle-events', () => ({
  recordPlaceLifecycleEvent: recordPlaceLifecycleEventMock,
}));

vi.mock('../cache/invalidation', () => ({
  invalidatePlace: invalidatePlaceMock,
}));

vi.mock('../email/submission-notifications', () => ({
  notifyPlaceSubmissionDecision: notifyPlaceSubmissionDecisionMock,
}));

import { POST } from '../../pages/api/admin/moderation';

beforeEach(() => {
  requireRoleMock.mockReset();
  requireRoleMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
  queryMock.mockReset();
  recordPlaceLifecycleEventMock.mockReset();
  recordPlaceLifecycleEventMock.mockResolvedValue(undefined);
  invalidatePlaceMock.mockReset();
  invalidatePlaceMock.mockResolvedValue(undefined);
  notifyPlaceSubmissionDecisionMock.mockReset();
  notifyPlaceSubmissionDecisionMock.mockResolvedValue(undefined);
  assertPlaceStatusTransitionMock.mockClear();
});

describe('POST /api/admin/moderation (submission emails)', () => {
  it('approve submission → owner decision email + cache invalidation', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          status: 'pending',
          name: 'Urfa Sofrasi',
          owner_email: 'owner@example.com',
          owner_name: 'Ali Veli',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'place-1', name: 'Urfa Sofrasi', status: 'active' }],
      });

    const resp = await POST(createApiContext({
      method: 'POST',
      body: { type: 'submission', action: 'approve', id: 'place-1', notes: 'Yayına alındı' },
    }));

    expect(resp.status).toBe(200);
    expect(recordPlaceLifecycleEventMock).toHaveBeenCalledWith(expect.objectContaining({
      placeId: 'place-1',
      toStatus: 'active',
      actorUserId: 'admin-1',
    }));
    expect(invalidatePlaceMock).toHaveBeenCalledWith('place-1');
    expect(notifyPlaceSubmissionDecisionMock).toHaveBeenCalledWith(
      'owner@example.com',
      'Ali Veli',
      'Urfa Sofrasi',
      true,
      'Yayına alındı',
    );
  });

  it('reject submission → rejection email uses reason', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{
          status: 'pending',
          name: 'Taslak Mekan',
          owner_email: 'reject@example.com',
          owner_name: 'Zeynep',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'place-2', name: 'Taslak Mekan', status: 'rejected' }],
      });

    const resp = await POST(createApiContext({
      method: 'POST',
      body: { type: 'submission', action: 'reject', id: 'place-2', reason: 'Eksik belge' },
    }));

    expect(resp.status).toBe(200);
    expect(invalidatePlaceMock).toHaveBeenCalledWith('place-2');
    expect(notifyPlaceSubmissionDecisionMock).toHaveBeenCalledWith(
      'reject@example.com',
      'Zeynep',
      'Taslak Mekan',
      false,
      'Eksik belge',
    );

    const data = await parseJson(resp);
    expect(data.data.reason).toBe('Eksik belge');
  });
});
