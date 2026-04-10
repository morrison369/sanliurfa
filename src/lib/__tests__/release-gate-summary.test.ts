import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getReleaseGateSummary } from '../release-gate-summary';

const reportsDir = resolve(process.cwd(), 'docs/reports');
const summaryPath = resolve(reportsDir, 'release-gate-summary.json');

async function readBackup(): Promise<string | null> {
  try {
    return await readFile(summaryPath, 'utf8');
  } catch {
    return null;
  }
}

describe('release gate summary reader', () => {
  afterEach(async () => {
    await rm(summaryPath, { force: true });
  });

  it('returns missing fallback when summary file is absent', async () => {
    const previous = await readBackup();
    await rm(summaryPath, { force: true });

    try {
      const summary = await getReleaseGateSummary();

      expect(summary.available).toBe(false);
      expect(summary.finalStatus).toBe('missing');
      expect(summary.performanceOptimization).toBeNull();
    } finally {
      if (previous !== null) {
        await mkdir(reportsDir, { recursive: true });
        await writeFile(summaryPath, previous, 'utf8');
      }
    }
  });

  it('reads embedded performance optimization summary when file is present', async () => {
    const previous = await readBackup();
    await mkdir(reportsDir, { recursive: true });
    await writeFile(summaryPath, JSON.stringify({
      generatedAt: '2026-04-10T00:00:00.000Z',
      finalStatus: 'passed',
      blockingFailedSteps: [],
      advisoryFailedSteps: [],
      steps: [],
      performanceOptimization: {
        recommendations: { total: 3, highPriority: 1, mediumPriority: 2 },
        metrics: { slowRequestRate: 11, cacheHitRate: 48 }
      }
    }), 'utf8');

    try {
      const summary = await getReleaseGateSummary();

      expect(summary.available).toBe(true);
      expect(summary.finalStatus).toBe('passed');
      expect(summary.performanceOptimization?.recommendations.total).toBe(3);
      expect(summary.performanceOptimization?.metrics.cacheHitRate).toBe(48);
    } finally {
      if (previous === null) {
        await rm(summaryPath, { force: true });
      } else {
        await writeFile(summaryPath, previous, 'utf8');
      }
    }
  });
});
