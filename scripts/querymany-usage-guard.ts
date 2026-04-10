import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, extname, relative } from 'node:path';

type QueryManyBudget = {
  max_legacy_usages: number;
};

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.astro']);
const LEGACY_PATTERN = /\bqueryMany\s*\(/g;

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (SCAN_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadBudget(path: string): QueryManyBudget {
  return JSON.parse(readFileSync(path, 'utf8')) as QueryManyBudget;
}

function main(): void {
  const root = process.cwd();
  const srcDir = resolve(root, 'src');
  const budget = loadBudget(resolve(root, 'config', 'querymany-usage-budget.json'));
  const offenders: string[] = [];

  for (const file of collectFiles(srcDir)) {
    if (file.endsWith(`${join('src', 'lib', 'postgres.ts')}`)) {
      continue;
    }

    const content = readFileSync(file, 'utf8');
    if (LEGACY_PATTERN.test(content)) {
      offenders.push(relative(root, file));
    }
  }

  if (offenders.length > budget.max_legacy_usages) {
    throw new Error(
      [
        `legacy queryMany usage budget exceeded (${offenders.length}/${budget.max_legacy_usages})`,
        ...offenders.slice(0, 50).map((file) => `- ${file}`)
      ].join('\n')
    );
  }

  console.log(`querymany-usage-guard: OK (legacy_usages=${offenders.length}/${budget.max_legacy_usages})`);
}

main();
