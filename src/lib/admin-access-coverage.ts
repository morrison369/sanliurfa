import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { logger } from './logging';

export type AdminAccessCoverage = {
  available: boolean;
  generatedAt: string | null;
  routeFiles: number;
  wrapperFiles: number;
  driftCount: number;
  coveragePercent: number;
  driftedFiles: string[];
};

const defaultCoverage: AdminAccessCoverage = {
  available: false,
  generatedAt: null,
  routeFiles: 0,
  wrapperFiles: 0,
  driftCount: 0,
  coveragePercent: 0,
  driftedFiles: [],
};

export async function getAdminAccessCoverage(): Promise<AdminAccessCoverage> {
  const summaryPath = resolve(process.cwd(), 'docs/reports/admin-access-coverage.json');

  try {
    const raw = await readFile(summaryPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AdminAccessCoverage>;

    return {
      available: true,
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null,
      routeFiles: Number(parsed.routeFiles ?? 0),
      wrapperFiles: Number(parsed.wrapperFiles ?? 0),
      driftCount: Number(parsed.driftCount ?? 0),
      coveragePercent: Number(parsed.coveragePercent ?? 0),
      driftedFiles: Array.isArray(parsed.driftedFiles) ? parsed.driftedFiles.filter((entry): entry is string => typeof entry === 'string') : [],
    };
  } catch (error) {
    logger.warn('Admin access coverage summary could not be read', {
      error: error instanceof Error ? error.message : String(error),
    });
    return defaultCoverage;
  }
}
