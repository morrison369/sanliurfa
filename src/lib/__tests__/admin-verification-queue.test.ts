import { describe, expect, it } from 'vitest';

import {
  canRejectVerification,
  getAdminVerificationRequests,
  isVerificationMutationSuccessful,
  normalizeRejectReason,
  renderAdminVerificationQueue,
} from '../admin-verification-queue';

describe('admin verification queue helpers', () => {
  it('extracts verification requests', () => {
    const items = getAdminVerificationRequests({
      success: true,
      verifications: [
        {
          id: 'ver-1',
          placeId: 'place-1',
          placeName: 'Göbeklitepe Cafe',
          category: 'Kafe',
          rating: 4.5,
          requestedAt: '2026-04-17T00:00:00.000Z',
          reason: 'Sahiplik doğrulaması gerekli',
        },
      ],
      count: 1,
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.placeName).toBe('Göbeklitepe Cafe');
  });

  it('validates reject reason', () => {
    expect(normalizeRejectReason('  eksik belge  ')).toBe('eksik belge');
    expect(canRejectVerification('kısa')).toBe(false);
    expect(canRejectVerification('Eksik belge nedeniyle reddedildi')).toBe(true);
  });

  it('checks mutation success and renders html', () => {
    expect(isVerificationMutationSuccessful({ success: true, message: 'ok' })).toBe(true);
    expect(isVerificationMutationSuccessful({ success: false, message: 'fail' })).toBe(false);

    const html = renderAdminVerificationQueue({
      verifications: [
        {
          id: 'ver-1',
          placeId: 'place-1',
          placeName: 'Göbeklitepe Cafe',
          category: 'Kafe',
          rating: 4.5,
          requestedAt: '2026-04-17T00:00:00.000Z',
          reason: 'Sahiplik doğrulaması gerekli',
        },
      ],
      error: null,
      processingId: null,
      showRejectFormId: 'ver-1',
      rejectReasons: { 'ver-1': 'Eksik belge nedeniyle reddedildi' },
    });

    expect(html).toContain('Göbeklitepe Cafe');
    expect(html).toContain('Reddetme nedeni');
    expect(html).toContain('Onayla');
  });
});
