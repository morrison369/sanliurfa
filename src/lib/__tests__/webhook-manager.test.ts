import { describe, expect, it } from 'vitest';

import {
  createWebhookManagerState,
  extractWebhookManagerData,
  renderWebhookManager,
} from '../webhook-manager';

describe('webhook manager helpers', () => {
  it('extracts webhooks from api payload', () => {
    const webhooks = extractWebhookManagerData({
      success: true,
      data: [
        {
          id: 'wh-1',
          event: 'place.created',
          url: 'https://example.com/hook',
          active: true,
          created_at: '2026-04-17T00:00:00.000Z',
          last_triggered_at: '2026-04-17T01:00:00.000Z',
        },
      ],
    });

    expect(webhooks).toHaveLength(1);
    expect(webhooks[0]?.id).toBe('wh-1');
    expect(webhooks[0]?.lastTriggeredAt).toBe('2026-04-17T01:00:00.000Z');
  });

  it('renders manager html with form and actions', () => {
    const state = createWebhookManagerState();
    state.loading = false;
    state.showForm = true;
    state.form.event = 'place.created';
    state.form.url = 'https://example.com/hook';
    state.webhooks = [
      {
        id: 'wh-1',
        event: 'place.created',
        url: 'https://example.com/hook',
        active: true,
        createdAt: '2026-04-17T00:00:00.000Z',
        lastTriggeredAt: null,
      },
    ];

    const html = renderWebhookManager(state);

    expect(html).toContain('Formu kapat');
    expect(html).toContain('data-webhook-form');
    expect(html).toContain('data-webhook-test="wh-1"');
    expect(html).toContain('Henuz tetiklenmedi');
  });
});
