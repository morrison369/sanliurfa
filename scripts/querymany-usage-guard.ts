import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, extname, relative } from 'node:path';

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

function main(): void {
  const root = process.cwd();
  const srcDir = resolve(root, 'src');
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

  if (offenders.length > 0) {
    throw new Error(
      [
        `deprecated queryMany usage detected (${offenders.length})`,
        ...offenders.slice(0, 50).map((file) => `- ${file}`)
      ].join('\n')
    );
  }

  console.log('querymany-usage-guard: OK (legacy_usages=0)');
}

main();
