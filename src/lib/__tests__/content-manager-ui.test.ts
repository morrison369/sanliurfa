import { describe, expect, it } from 'vitest';

import {
  defaultContentManagerForm,
  extractContentManagerItems,
  extractContentManagerMessage,
  renderContentManager,
} from '../content-manager-ui';

describe('content manager ui helpers', () => {
  it('unwraps nested content payload', () => {
    const items = extractContentManagerItems({
      data: {
        success: true,
        data: [
          {
            id: 'c1',
            title: 'Başlık',
            status: 'draft',
            visibility: 'private',
            view_count: 0,
            like_count: 0,
            created_at: '2026-04-17T00:00:00.000Z',
          },
        ],
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Başlık');
  });

  it('renders form and list with nested message', () => {
    const html = renderContentManager({
      items: [
        {
          id: 'c1',
          title: 'Başlık',
          description: 'Açıklama',
          status: 'draft',
          visibility: 'private',
          view_count: 1,
          like_count: 2,
          created_at: '2026-04-17T00:00:00.000Z',
        },
      ],
      loading: false,
      showForm: true,
      saving: false,
      error: extractContentManagerMessage({ data: { message: 'Tamam' } }, 'Hata'),
      form: defaultContentManagerForm(),
    });

    expect(html).toContain('Başlık');
    expect(html).toContain('Tamam');
    expect(html).toContain('İçeriği oluştur');
  });
});
