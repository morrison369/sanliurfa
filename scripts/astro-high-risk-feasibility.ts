import fs from 'node:fs';
import path from 'node:path';
import type { AstroHydrationInventoryReport } from '../src/lib/astro-migration-report';
import {
  buildAstroHighRiskReportMarkdown,
  createAstroHighRiskReport,
  groupHighRiskEntries,
  type HighRiskComponentMetrics,
} from '../src/lib/astro-high-risk-report';

const ROOT = process.cwd();
const INVENTORY_PATH = path.join(ROOT, 'docs', 'reports', 'astro-hydration-inventory.json');
const JSON_OUTPUT = path.join(ROOT, 'docs', 'reports', 'astro-high-risk-feasibility.json');
const MD_OUTPUT = path.join(ROOT, 'docs', 'reports', 'astro-high-risk-feasibility.md');
const COMPONENTS_DIR = path.join(ROOT, 'src', 'components');

function readInventory(): AstroHydrationInventoryReport {
  return JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')) as AstroHydrationInventoryReport;
}

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function resolveComponentPath(componentName: string): string {
  const files = walkFiles(COMPONENTS_DIR);
  const exact = files.find((file) => file.endsWith(`${componentName}.tsx`));
  if (!exact) {
    throw new Error(`component-not-found:${componentName}`);
  }
  return exact;
}

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

function buildMetrics(componentName: string, pagePaths: string[]): HighRiskComponentMetrics {
  const componentPath = resolveComponentPath(componentName);
  const content = fs.readFileSync(componentPath, 'utf8');
  const relativeComponentPath = path.relative(ROOT, componentPath).replaceAll('\\', '/');

  return {
    componentName,
    componentPath: relativeComponentPath,
    pagePaths: [...new Set(pagePaths)].sort(),
    usageCount: pagePaths.length,
    lines: content.split(/\r?\n/).length,
    useStateCount: countMatches(content, /useState/g),
    useEffectCount: countMatches(content, /useEffect/g),
    fetchCount: countMatches(content, /fetch\(/g),
    typedClientCount: countMatches(content, /fetchAdmin|buildAdmin/g),
    adminSurface: pagePaths.some((pagePath) => pagePath.includes('/admin/')),
  };
}

function main() {
  const inventory = readInventory();
  const grouped = groupHighRiskEntries(inventory.entries.filter((entry) => entry.risk === 'high'));
  const metrics = [...grouped.entries()].map(([componentName, pagePaths]) =>
    buildMetrics(componentName, pagePaths),
  );
  const report = createAstroHighRiskReport({ entries: metrics });

  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(report, null, 2));
  fs.writeFileSync(MD_OUTPUT, buildAstroHighRiskReportMarkdown(report));

  console.log(
    `astro-high-risk-feasibility: OK (components=${report.totalHighRiskComponents}, first=${report.firstCount}, later=${report.laterCount}, last=${report.lastCount})`,
  );
}

main();
