import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  const reportsDir = resolve(root, 'docs', 'reports');
  const outputPath = resolve(reportsDir, 'weekly-typecheck-report.md');

  const tsconfig = loadJson<TsConfig>(tsconfigPath);
  const excludes = Array.isArray(tsconfig.exclude) ? tsconfig.exclude : [];
  const policyExcludes = excludes.filter((entry) => !BASELINE_EXCLUDES.has(entry));
  const fileExcludes = policyExcludes.filter((entry) => entry.startsWith('src/lib/') && entry.endsWith('.ts'));
  const baselineExcludes = excludes.filter((entry) => BASELINE_EXCLUDES.has(entry));

  const lines = [
    '# Weekly Typecheck Report',
    '',
    '## Experimental Exclude Policy',
    `- Total entries: ${policyExcludes.length}`,
    `- File entries: ${fileExcludes.length}`,
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
