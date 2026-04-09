import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type ExperimentalBudget = {
  max_entries: number;
  max_file_entries: number;
};

type TsConfigLike = {
  exclude?: string[];
};

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function main(): void {
  const root = process.cwd();
  const tsconfigPath = resolve(root, 'tsconfig.experimental.json');
  const budgetPath = resolve(root, 'config', 'experimental-exclude-budget.json');

  const tsconfig = loadJson<TsConfigLike>(tsconfigPath);
  const budget = loadJson<ExperimentalBudget>(budgetPath);
  const excludes = Array.isArray(tsconfig.exclude) ? tsconfig.exclude : [];

  const fileEntries = excludes.filter((entry) => entry.startsWith('src/lib/') && entry.endsWith('.ts'));

  const overTotal = excludes.length - budget.max_entries;
  const overFiles = fileEntries.length - budget.max_file_entries;

  if (overTotal > 0 || overFiles > 0) {
    throw new Error(
      [
        'typecheck experimental exclude budget exceeded',
        `total=${excludes.length} max=${budget.max_entries}`,
        `file_entries=${fileEntries.length} max=${budget.max_file_entries}`,
      ].join(' | ')
    );
  }

  console.log(
    `experimental-exclude-guard: OK (total=${excludes.length}/${budget.max_entries}, file_entries=${fileEntries.length}/${budget.max_file_entries})`
  );
}

main();

