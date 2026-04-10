import { describe, expect, it } from 'vitest';
import {
  WEBHOOK_RETRY_MAX_SECONDS,
  calculateWebhookRetryBackoffSeconds,
  decideWebhookRetry,
} from '../webhook-delivery-policy';

describe('webhook delivery retry policy', () => {
  it('allows processing when no previous delivery exists', () => {
    const decision = decideWebhookRetry(null);
    expect(decision.shouldProcess).toBe(true);
  });

  it('defers processing while backoff window is still active', () => {
    const now = new Date('2026-04-10T10:00:00.000Z');
    const decision = decideWebhookRetry(
      {
        status: 'failed',
        retry_count: 1,
        last_tried_at: '2026-04-10T09:58:30.000Z',
      },
      now
    );

    expect(decision.shouldProcess).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    expect(decision.exhausted).not.toBe(true);
  });

  it('allows processing after backoff window elapsed', () => {
    const now = new Date('2026-04-10T10:00:00.000Z');
    const decision = decideWebhookRetry(
      {
        status: 'failed',
        retry_count: 1,
        last_tried_at: '2026-04-10T09:57:00.000Z',
      },
      now
    );

    expect(decision.shouldProcess).toBe(true);
  });

  it('marks retry budget as exhausted when max attempts reached', () => {
    const decision = decideWebhookRetry({
      status: 'failed',
      retry_count: 8,
      last_tried_at: '2026-04-10T09:00:00.000Z',
    });

    expect(decision.shouldProcess).toBe(false);
    expect(decision.exhausted).toBe(true);
  });

  it('caps computed backoff at max configured seconds', () => {
    expect(calculateWebhookRetryBackoffSeconds(50)).toBe(WEBHOOK_RETRY_MAX_SECONDS);
  });
});
