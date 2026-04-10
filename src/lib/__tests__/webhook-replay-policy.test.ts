import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processPendingReplays } from '../webhook-replay';
import { triggerWebhook } from '../webhooks';

vi.mock('../webhooks', () => ({
  triggerWebhook: vi.fn(),
}));

const triggerWebhookMock = vi.mocked(triggerWebhook);

describe('webhook replay retry policy integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('skips failed replay rows when retry backoff is still active', async () => {
    const pool = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'replay-1',
            webhook_id: 'webhook-1',
            event_type: 'invoice.payment_failed',
            event_data: {},
            event_id: 'event-1',
            status: 'failed',
            retry_count: 1,
            max_retries: 8,
            last_tried_at: new Date().toISOString(),
            next_retry_at: null,
          }]
        }),
    } as any;

    const processed = await processPendingReplays(pool, 50);
    expect(processed).toBe(0);
    expect(triggerWebhookMock).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('marks replay as completed on successful trigger', async () => {
    const pool = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'replay-1',
            webhook_id: 'webhook-1',
            event_type: 'invoice.payment_failed',
            event_data: {},
            event_id: 'event-1',
            status: 'pending',
            retry_count: 0,
            max_retries: 8,
            last_tried_at: null,
            next_retry_at: null,
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 }),
    } as any;

    triggerWebhookMock.mockResolvedValueOnce(undefined);
    const processed = await processPendingReplays(pool, 50);

    expect(processed).toBe(1);
    expect(triggerWebhookMock).toHaveBeenCalledWith('invoice.payment_failed', {}, '');
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SET status = 'processing'"),
      ['replay-1']
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("SET status = 'completed'"),
      ['replay-1']
    );
  });

  it('increments retry metadata and schedules next attempt on failure', async () => {
    const pool = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'replay-1',
            webhook_id: 'webhook-1',
            event_type: 'invoice.payment_failed',
            event_data: {},
            event_id: 'event-1',
            status: 'pending',
            retry_count: 0,
            max_retries: 8,
            last_tried_at: null,
            next_retry_at: null,
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 }),
    } as any;

    triggerWebhookMock.mockRejectedValueOnce(new Error('network'));
    const processed = await processPendingReplays(pool, 50);

    expect(processed).toBe(0);
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("SET status = 'failed'"),
      [1, 'Error: network', expect.any(String), false, 'replay-1']
    );
  });
});
