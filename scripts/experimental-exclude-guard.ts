import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type TsConfigLike = {
  exclude?: string[];
};

const BASELINE_EXCLUDES = new Set([
  'src/lib/__tests__/**',
  'src/**/*.test.ts',
  'src/**/*.spec.ts',
]);

function main(): void {
  const root = process.cwd();
  const tsconfigPath = resolve(root, 'tsconfig.experimental.json');

  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as TsConfigLike;
  const excludes = Array.isArray(tsconfig.exclude) ? tsconfig.exclude : [];
  const policyExcludes = excludes.filter((entry) => !BASELINE_EXCLUDES.has(entry));
  const fileEntries = policyExcludes.filter((entry) => entry.startsWith('src/lib/') && entry.endsWith('.ts'));

  if (policyExcludes.length > 0 || fileEntries.length > 0) {
    throw new Error(
      [
        'typecheck experimental excludes detected',
        `total=${policyExcludes.length}`,
        `file_entries=${fileEntries.length}`,
      ].join(' | ')
    );
  }

  console.log(
    `experimental-exclude-guard: OK (total=${policyExcludes.length}, file_entries=${fileEntries.length})`
  );
}

main();
