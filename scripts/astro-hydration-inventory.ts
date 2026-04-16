import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildAstroHydrationInventoryMarkdown,
  createAstroHydrationInventoryReport,
} from '../src/lib/astro-migration-report';

const SRC_ROOT = resolve(process.cwd(), 'src');
const REPORT_JSON_PATH = resolve(process.cwd(), 'docs', 'reports', 'astro-hydration-inventory.json');
const REPORT_MD_PATH = resolve(process.cwd(), 'docs', 'reports', 'astro-hydration-inventory.md');
const HYDRATION_PATTERN =
  /<([A-Z][A-Za-z0-9_]*)[^>]*client:(load|idle|visible|media|only)\b/g;

function walk(directory: string, extension: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath, extension));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith(extension)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function toRelativePath(absolutePath: string): string {
  return absolutePath.replace(process.cwd(), '').replace(/^[\\/]+/, '').replace(/\\/g, '/');
}

function collectHydrationEntries(astroFiles: string[]) {
  const entries: Array<{
    pagePath: string;
    componentName: string;
    directive: 'load' | 'idle' | 'visible' | 'media' | 'only';
  }> = [];

  for (const filePath of astroFiles) {
    const source = readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(HYDRATION_PATTERN)) {
      entries.push({
        pagePath: toRelativePath(filePath),
        componentName: match[1],
        directive: match[2] as 'load' | 'idle' | 'visible' | 'media' | 'only',
      });
    }
  }

  return entries;
}

function main(): void {
  if (!statSync(SRC_ROOT).isDirectory()) {
    throw new Error(`astro-hydration-inventory: src root missing at ${SRC_ROOT}`);
  }

  const astroFiles = walk(SRC_ROOT, '.astro');
  const tsxFiles = walk(SRC_ROOT, '.tsx');
  const report = createAstroHydrationInventoryReport({
    astroFiles: astroFiles.length,
    tsxFiles: tsxFiles.length,
    entries: collectHydrationEntries(astroFiles),
  });

  mkdirSync(resolve(process.cwd(), 'docs', 'reports'), { recursive: true });
  writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(REPORT_MD_PATH, buildAstroHydrationInventoryMarkdown(report), 'utf8');

  console.log(
    `astro-hydration-inventory: OK (astro_files=${report.astroFiles}, tsx_files=${report.tsxFiles}, hydration_points=${report.totalHydrationPoints}, low=${report.lowRiskCount}, medium=${report.mediumRiskCount}, high=${report.highRiskCount})`,
  );
}

main();
