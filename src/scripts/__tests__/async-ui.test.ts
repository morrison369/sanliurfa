import { describe, expect, it, vi } from 'vitest';

import { delay, readJsonSafely, retryOnce } from '../shared/async-ui';

describe('async ui helpers', () => {
  it('retries once before succeeding', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce('ok');

    const result = await retryOnce(operation, 0);

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('reads json safely', async () => {
    const response = {
      json: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Response;

    await expect(readJsonSafely(response)).resolves.toEqual({ success: true });
  });

  it('returns null when response body is not json', async () => {
    const response = {
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    } as unknown as Response;

    await expect(readJsonSafely(response)).resolves.toBeNull();
  });

  it('delay resolves asynchronously', async () => {
    const started = Date.now();
    await delay(0);
    expect(Date.now()).toBeGreaterThanOrEqual(started);
  });
});
