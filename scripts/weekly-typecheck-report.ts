import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Budget = { max_entries: number; max_file_entries: number };
type TsConfig = { exclude?: string[] };

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const BASELINE_EXCLUDES = new Set([
  'src/lib/__tests__/**',
  'src/**/*.test.ts',
  'src/**/*.spec.ts',
]);

function main(): void {
  const root = process.cwd();
  const tsconfigPath = resolve(root, 'tsconfig.experimental.json');
  const budgetPath = resolve(root, 'config', 'experimental-exclude-budget.json');
  const reportsDir = resolve(root, 'docs', 'reports');
  const outputPath = resolve(reportsDir, 'weekly-typecheck-report.md');

  const tsconfig = loadJson<TsConfig>(tsconfigPath);
  const budget = loadJson<Budget>(budgetPath);
  const excludes = Array.isArray(tsconfig.exclude) ? tsconfig.exclude : [];
  const budgetedExcludes = excludes.filter((entry) => !BASELINE_EXCLUDES.has(entry));
  const fileExcludes = budgetedExcludes.filter((entry) => entry.startsWith('src/lib/') && entry.endsWith('.ts'));
  const baselineExcludes = excludes.filter((entry) => BASELINE_EXCLUDES.has(entry));

  const lines = [
    '# Weekly Typecheck Report',
    '',
    '## Experimental Exclude Budget',
    `- Total entries: ${budgetedExcludes.length}/${budget.max_entries}`,
    `- File entries: ${fileExcludes.length}/${budget.max_file_entries}`,
    `- Baseline test excludes: ${baselineExcludes.length}`,
    '',
    '## Current Excluded Files',
    ...fileExcludes.map((file) => `- ${file}`),
    ''
  ];

  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(outputPath, lines.join('\n'), 'utf8');
  console.log(`weekly-typecheck-report: OK (${outputPath})`);
}

main();
