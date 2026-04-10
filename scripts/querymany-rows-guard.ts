import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, extname, relative } from 'node:path';

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.astro']);
const LEGACY_PATTERN = /queryMany\s*\([\s\S]{0,500}?\)\s*\.rows\b/gm;

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
  const files = collectFiles(srcDir);
  const offenders: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (LEGACY_PATTERN.test(content)) {
      offenders.push(relative(root, file));
    }
  }

  if (offenders.length > 0) {
    throw new Error(
      ['legacy queryMany(...).rows usage detected', ...offenders.map((file) => `- ${file}`)].join('\n')
    );
  }

  console.log('querymany-rows-guard: OK');
}

main();
