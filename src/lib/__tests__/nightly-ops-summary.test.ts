import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getNightlyOpsSummary } from '../nightly-ops-summary';

const reportsDir = resolve(process.cwd(), 'docs/reports');
const regressionPath = resolve(reportsDir, 'nightly-regression-summary.json');
const e2ePath = resolve(reportsDir, 'nightly-e2e-summary.json');

async function withBackup(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function restore(filePath: string, previous: string | null): Promise<void> {
  if (previous === null) {
    await rm(filePath, { force: true });
    return;
  }

  await writeFile(filePath, previous, 'utf8');
}

describe('nightly ops summary reader', () => {
  afterEach(async () => {
    await rm(regressionPath, { force: true });
    await rm(e2ePath, { force: true });
  });

  it('returns missing fallback when summary files are absent', async () => {
    const summary = await getNightlyOpsSummary();

    expect(summary.regression.available).toBe(false);
    expect(summary.regression.outcome).toBe('missing');
    expect(summary.e2e.available).toBe(false);
    expect(summary.e2e.outcome).toBe('missing');
  });

  it('reads embedded performance optimization summary when file is present', async () => {
    const prevRegression = await withBackup(regressionPath);
    const prevE2e = await withBackup(e2ePath);
    await mkdir(reportsDir, { recursive: true });
    await writeFile(regressionPath, JSON.stringify({
      available: true,
      kind: 'regression',
      generatedAt: '2026-04-10T00:00:00.000Z',
      outcome: 'success',
      successRatePercent: 80,
      recentOutcomes: ['success'],
      topFailures: [],
      performanceOptimization: {
        recommendations: { total: 4, highPriority: 2, mediumPriority: 2 },
        metrics: { slowRequestRate: 14, cacheHitRate: 42 }
      }
    }), 'utf8');
    await writeFile(e2ePath, JSON.stringify({
      available: true,
      kind: 'e2e',
      generatedAt: '2026-04-10T00:00:00.000Z',
      outcome: 'failure',
      successRatePercent: 50,
      recentOutcomes: ['failure'],
      topFailures: ['timeout']
    }), 'utf8');

    try {
      const summary = await getNightlyOpsSummary();

      expect(summary.regression.available).toBe(true);
      expect(summary.regression.performanceOptimization?.recommendations.total).toBe(4);
      expect(summary.regression.performanceOptimization?.metrics.slowRequestRate).toBe(14);
      expect(summary.e2e.available).toBe(true);
    } finally {
      await restore(regressionPath, prevRegression);
      await restore(e2ePath, prevE2e);
    }
  });
});
