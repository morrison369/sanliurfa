#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type ClusterDef = {
  name: string;
  prefixes: string[];
};

const clusters: ClusterDef[] = [
  { name: 'auth', prefixes: ['/auth', '/users', '/profile'] },
  { name: 'admin-site', prefixes: ['/admin', '/content', '/media', '/docs'] },
  { name: 'social', prefixes: ['/social', '/messages', '/followers', '/following', '/feed', '/leaderboard', '/leaderboards'] },
  { name: 'places', prefixes: ['/places', '/reviews', '/favorites', '/collections', '/search'] },
];

const baselinePath = path.join(process.cwd(), 'docs', 'openapi-route-gap-baseline.json');
const apiRoot = path.join(process.cwd(), 'src', 'pages', 'api');
const openApiRouteFile = path.join(apiRoot, 'docs', 'openapi.json.ts');
const outJson = path.join(process.cwd(), 'docs', 'openapi-p0-closure-report.json');
const outMd = path.join(process.cwd(), 'docs', 'openapi-p0-closure-report.md');

type GapBaseline = { generatedAt?: string; missingInSpec?: string[] };

function readBaseline(): GapBaseline {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline file not found: ${baselinePath}`);
  }
  return JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as GapBaseline;
}

function walkApiFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkApiFiles(full));
      continue;
    }
    if (!/\.(ts|js|mjs)$/.test(entry.name)) continue;
    if (full.endsWith(path.join('docs', 'openapi.json.ts'))) continue;
    files.push(full);
  }
  return files;
}

function filePathToRoute(filePath: string): string {
  const rel = path.relative(apiRoot, filePath).replace(/\\/g, '/');
  let route = `/${rel.replace(/\.(ts|js|mjs)$/, '')}`;
  route = route.replace(/\/index$/, '');
  route = route.replace(/\[\.\.\.([^\]]+)\]/g, '{$1}');
  route = route.replace(/\[([^\]]+)\]/g, '{$1}');
  return route === '' ? '/' : route;
}

function normalizeRoute(route: string): string {
  return route.replace(/\{[^}]+\}/g, '{}').replace(/\/+$/, '');
}

async function getOpenApiSpec() {
  const moduleUrl = pathToFileURL(openApiRouteFile).href;
  const mod = await import(moduleUrl);
  if (typeof mod.GET !== 'function') {
    throw new Error('openapi.json.ts GET handler not found');
  }
  const response = await mod.GET({} as any);
  if (!response || response.status !== 200) {
    throw new Error(`openapi GET failed with status ${response?.status}`);
  }
  return response.json();
}

function classify(route: string): string {
  for (const cluster of clusters) {
    if (cluster.prefixes.some((prefix) => route.startsWith(prefix))) {
      return cluster.name;
    }
  }
  return 'other';
}

async function main() {
  const spec = await getOpenApiSpec();
  const baseline = readBaseline();
  const baselineMissing = baseline.missingInSpec || [];
  const specPaths = Object.keys(spec?.paths ?? {});
  const specPathSet = new Set(specPaths.map(normalizeRoute));
  const fileRoutes = walkApiFiles(apiRoot).map(filePathToRoute);
  const missingInSpec = fileRoutes.filter((r) => !specPathSet.has(normalizeRoute(r)));
  const resolvedFromBaseline = baselineMissing.filter((r) => !missingInSpec.includes(r));
  const newlyMissingVsBaseline = missingInSpec.filter((r) => !baselineMissing.includes(r));

  const rows = missingInSpec.map((route) => ({
    route,
    cluster: classify(route),
    sourceExists: true,
  }));

  const grouped = new Map<string, { total: number; withSource: number; withoutSource: number }>();
  for (const row of rows) {
    const prev = grouped.get(row.cluster) || { total: 0, withSource: 0, withoutSource: 0 };
    prev.total += 1;
    if (row.sourceExists) prev.withSource += 1;
    else prev.withoutSource += 1;
    grouped.set(row.cluster, prev);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    baselineGeneratedAt: baseline.generatedAt || null,
    documentedPaths: specPaths.length,
    fileRoutes: fileRoutes.length,
    totalMissing: rows.length,
    resolvedFromBaseline: resolvedFromBaseline.length,
    newlyMissingVsBaseline: newlyMissingVsBaseline.length,
    byCluster: Object.fromEntries(grouped),
    topPriority: rows
      .filter((r) => ['auth', 'admin-site', 'social', 'places'].includes(r.cluster))
      .sort((a, b) => Number(b.sourceExists) - Number(a.sourceExists))
      .slice(0, 200),
  };

  fs.writeFileSync(outJson, JSON.stringify(output, null, 2), 'utf8');

  const lines: string[] = [];
  lines.push('# OpenAPI P0 Closure Report');
  lines.push('');
  lines.push(`- Generated At: ${output.generatedAt}`);
  lines.push(`- Baseline: ${output.baselineGeneratedAt || 'n/a'}`);
  lines.push(`- Documented Paths: ${output.documentedPaths}`);
  lines.push(`- File Routes: ${output.fileRoutes}`);
  lines.push(`- Total Missing: ${output.totalMissing}`);
  lines.push(`- Resolved vs Baseline: ${output.resolvedFromBaseline}`);
  lines.push(`- Newly Missing vs Baseline: ${output.newlyMissingVsBaseline}`);
  lines.push('');
  lines.push('## Cluster Summary');
  lines.push('');
  lines.push('| Cluster | Total | Source Exists | Source Missing |');
  lines.push('|---|---:|---:|---:|');
  for (const [cluster, summary] of grouped.entries()) {
    lines.push(`| ${cluster} | ${summary.total} | ${summary.withSource} | ${summary.withoutSource} |`);
  }
  lines.push('');
  lines.push('## Top Priority Routes');
  lines.push('');
  lines.push('| Route | Cluster | Source Exists |');
  lines.push('|---|---|---|');
  for (const row of output.topPriority) {
    lines.push(`| \`${row.route}\` | ${row.cluster} | ${row.sourceExists ? 'yes' : 'no'} |`);
  }
  lines.push('');

  fs.writeFileSync(outMd, lines.join('\n'), 'utf8');
  console.log(`OpenAPI P0 report written: ${outJson}`);
  console.log(`OpenAPI P0 markdown written: ${outMd}`);
}

main().catch((error) => {
  console.error(`OpenAPI P0 report failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
