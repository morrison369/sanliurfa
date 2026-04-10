import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname, join, relative } from 'node:path';

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.astro']);
const REDIS_IMPORT_PATTERN = /import\s*\{[^}]*\bredis\b[^}]*\}\s*from\s*['"][^'"]*cache['"]/g;

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
    if (file.endsWith(`${join('src', 'lib', 'cache.ts')}`)) {
      continue;
    }
    const content = readFileSync(file, 'utf8');
    if (REDIS_IMPORT_PATTERN.test(content)) {
      offenders.push(relative(root, file));
    }
  }

  if (offenders.length > 0) {
    throw new Error(
      [
        `legacy redis cache import detected (${offenders.length})`,
        ...offenders.slice(0, 20).map((file) => `- ${file}`),
      ].join('\n')
    );
  }

  console.log('cache-redis-import-guard: OK (legacy_imports=0)');
}

main();
