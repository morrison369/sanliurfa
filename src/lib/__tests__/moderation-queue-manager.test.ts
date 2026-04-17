import { describe, expect, it } from 'vitest';

import {
  getModerationQueueItems,
  isModerationMutationSuccessful,
  normalizeModerationQueueStatus,
  renderModerationQueueManager,
} from '../moderation-queue-manager';

describe('moderation queue manager helpers', () => {
  it('normalizes status and extracts items', () => {
    expect(normalizeModerationQueueStatus('in_review')).toBe('in_review');
    expect(normalizeModerationQueueStatus('bad')).toBe('pending');

    const items = getModerationQueueItems({
      success: true,
      data: {
        items: [
          {
            id: 'queue-1',
            queue_type: 'review',
            priority: 'high',
            status: 'pending',
            reason: 'Spam',
            content_type: 'review',
            content_id: 'review-1',
            submitted_count: 2,
            assigned_to: null,
            assigned_at: null,
            resolved_at: null,
            created_at: '2026-04-17T00:00:00.000Z',
            updated_at: '2026-04-17T00:00:00.000Z',
          },
        ],
        count: 1,
        status: 'pending',
        limit: 20,
        offset: 0,
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('queue-1');
  });

  it('checks mutation success', () => {
    expect(isModerationMutationSuccessful({ success: true, message: 'ok' })).toBe(true);
    expect(isModerationMutationSuccessful({ success: false, message: 'fail' })).toBe(false);
  });

  it('renders queue html', () => {
    const html = renderModerationQueueManager({
      status: 'pending',
      error: null,
      actionInProgress: null,
      items: [
        {
          id: 'queue-1',
          queue_type: 'review',
          priority: 'high',
          status: 'pending',
          reason: 'Spam',
          content_type: 'review',
          content_id: 'review-1',
          submitted_count: 2,
          assigned_to: null,
          assigned_at: null,
          resolved_at: null,
          created_at: '2026-04-17T00:00:00.000Z',
          updated_at: '2026-04-17T00:00:00.000Z',
        },
      ],
    });

    expect(html).toContain('Beklemede');
    expect(html).toContain('Spam');
    expect(html).toContain('Ata');
  });
});
