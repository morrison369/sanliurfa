export interface WebhookDeliveryRetryState {
  status?: string | null;
  retry_count?: number | null;
  last_tried_at?: string | Date | null;
}

export interface WebhookRetryDecision {
  shouldProcess: boolean;
  retryAfterSeconds?: number;
  exhausted?: boolean;
}

export const WEBHOOK_RETRY_BASE_SECONDS = 60;
export const WEBHOOK_RETRY_MAX_SECONDS = 15 * 60;
export const WEBHOOK_RETRY_MAX_ATTEMPTS = 8;

function normalizeRetryCount(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function parseTimestampMs(value: unknown): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function calculateWebhookRetryBackoffSeconds(retryCount: number): number {
  const normalized = normalizeRetryCount(retryCount);
  const exponent = Math.min(normalized, 10);
  const backoff = WEBHOOK_RETRY_BASE_SECONDS * Math.pow(2, exponent);
  return Math.min(backoff, WEBHOOK_RETRY_MAX_SECONDS);
}

export function getWebhookNextRetryAt(retryCount: number, now: Date = new Date()): Date {
  const delaySeconds = calculateWebhookRetryBackoffSeconds(retryCount);
  return new Date(now.getTime() + (delaySeconds * 1000));
}

export function decideWebhookRetry(
  delivery: WebhookDeliveryRetryState | null | undefined,
  now: Date = new Date()
): WebhookRetryDecision {
  if (!delivery) {
    return { shouldProcess: true };
  }

  const retryCount = normalizeRetryCount(delivery.retry_count);
  if (retryCount >= WEBHOOK_RETRY_MAX_ATTEMPTS) {
    return {
      shouldProcess: false,
      exhausted: true,
      retryAfterSeconds: WEBHOOK_RETRY_MAX_SECONDS,
    };
  }

  const lastTriedAtMs = parseTimestampMs(delivery.last_tried_at);
  if (!lastTriedAtMs) {
    return { shouldProcess: true };
  }

  const elapsedSeconds = Math.floor((now.getTime() - lastTriedAtMs) / 1000);
  const backoffSeconds = calculateWebhookRetryBackoffSeconds(retryCount);
  if (elapsedSeconds >= backoffSeconds) {
    return { shouldProcess: true };
  }

  return {
    shouldProcess: false,
    retryAfterSeconds: Math.max(1, backoffSeconds - elapsedSeconds),
  };
}
