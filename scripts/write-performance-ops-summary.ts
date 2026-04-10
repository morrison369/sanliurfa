import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPerformanceOpsSummary } from '../src/lib/performance-ops-summary';

async function main(): Promise<void> {
  const summary = await getPerformanceOpsSummary();
  const reportsDir = resolve(process.cwd(), 'docs/reports');
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(
    resolve(reportsDir, 'performance-ops-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8'
  );
}

main().catch((error) => {
  console.error('[performance-ops-summary] failed', error);
  process.exitCode = 1;
});
