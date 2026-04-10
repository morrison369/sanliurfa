import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { logger } from './logging';

export type NightlyOpsSummary = {
  available: boolean;
  kind: 'regression' | 'e2e';
  generatedAt: string | null;
  outcome: 'success' | 'failure' | 'cancelled' | 'missing' | string;
  successRatePercent: number | null;
  recentOutcomes: string[];
  topFailures: string[];
};

function createDefaultSummary(kind: 'regression' | 'e2e'): NightlyOpsSummary {
  return {
    available: false,
    kind,
    generatedAt: null,
    outcome: 'missing',
    successRatePercent: null,
    recentOutcomes: [],
    topFailures: []
  };
}

async function readSummaryFile(fileName: string, kind: 'regression' | 'e2e'): Promise<NightlyOpsSummary> {
  const filePath = resolve(process.cwd(), 'docs/reports', fileName);

  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<NightlyOpsSummary>;
    return {
      available: true,
      kind,
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null,
      outcome: typeof parsed.outcome === 'string' ? parsed.outcome : 'missing',
      successRatePercent: typeof parsed.successRatePercent === 'number' ? parsed.successRatePercent : null,
      recentOutcomes: Array.isArray(parsed.recentOutcomes) ? parsed.recentOutcomes.map((item) => String(item)) : [],
      topFailures: Array.isArray(parsed.topFailures) ? parsed.topFailures.map((item) => String(item)) : []
    };
  } catch (error) {
    logger.warn('Nightly ops summary could not be read', {
      fileName,
      error: error instanceof Error ? error.message : String(error)
    });
    return createDefaultSummary(kind);
  }
}

export async function getNightlyOpsSummary(): Promise<{
  regression: NightlyOpsSummary;
  e2e: NightlyOpsSummary;
}> {
  const [regression, e2e] = await Promise.all([
    readSummaryFile('nightly-regression-summary.json', 'regression'),
    readSummaryFile('nightly-e2e-summary.json', 'e2e')
  ]);

  return {
    regression,
    e2e
  };
}
