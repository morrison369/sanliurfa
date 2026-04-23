import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface FailureEntry {
  bucket: 'places' | 'blog' | 'events';
  id: string;
  slug: string;
  title: string;
  attemptedQueries: string[];
  reason: string;
}

export interface ImageFillReport {
  generatedAt: string;
  mode: 'dry-run' | 'write';
  type: 'places' | 'blog' | 'events' | 'all';
  limit: number;
  queryMode: 'strict' | 'expanded';
  totals: {
    scanned: number;
    filled: number;
    failed: number;
  };
  buckets: Record<'places' | 'blog' | 'events', { scanned: number; filled: number; failed: number }>;
  failures: FailureEntry[];
}

export function resolveReportPath(reportJsonArg: string): string {
  return path.isAbsolute(reportJsonArg) ? reportJsonArg : path.join(process.cwd(), reportJsonArg);
}

export function loadReport(reportJsonArg: string): ImageFillReport {
  const reportPath = resolveReportPath(reportJsonArg);
  return JSON.parse(readFileSync(reportPath, 'utf8')) as ImageFillReport;
}

export function fillRate(report: ImageFillReport): number {
  if (report.totals.scanned <= 0) {
    return 0;
  }
  return (report.totals.filled / report.totals.scanned) * 100;
}

export function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}
