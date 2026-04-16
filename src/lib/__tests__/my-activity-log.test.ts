import { describe, expect, it } from 'vitest';

import { extractMyActivity, renderMyActivityLog } from '../my-activity-log';

describe('my activity log helpers', () => {
  it('unwraps nested activity envelope', () => {
    const items = extractMyActivity({
      data: {
        success: true,
        data: [
          {
            id: 1,
            actionType: 'review_created',
            createdAt: '2026-04-17T00:00:00.000Z',
          },
        ],
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.actionType).toBe('review_created');
  });

  it('renders activity rows', () => {
    const html = renderMyActivityLog(
      [
        {
          id: 1,
          actionType: 'favorite_added',
          metadata: { placeName: 'Göbeklitepe' },
          createdAt: '2026-04-17T00:00:00.000Z',
        },
      ],
      null,
    );

    expect(html).toContain('Benim Aktivitelerim');
    expect(html).toContain('Favorilere ekledin');
    expect(html).toContain('Göbeklitepe');
  });
});
