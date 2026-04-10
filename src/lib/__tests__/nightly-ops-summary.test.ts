import { describe, expect, it } from 'vitest';
import { getNightlyOpsSummary } from '../nightly-ops-summary';

describe('nightly ops summary reader', () => {
  it('returns missing fallback when summary files are absent', async () => {
    const summary = await getNightlyOpsSummary();

    expect(summary.regression.available).toBe(false);
    expect(summary.regression.outcome).toBe('missing');
    expect(summary.e2e.available).toBe(false);
    expect(summary.e2e.outcome).toBe('missing');
  });
});
