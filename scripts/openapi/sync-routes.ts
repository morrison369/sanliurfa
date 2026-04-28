#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const apiRoot = path.join(repoRoot, 'src', 'pages', 'api');
const openApiRouteFile = path.join(apiRoot, 'docs', 'openapi.json.ts');
const baselineFile = path.join(repoRoot, 'docs', 'openapi-route-gap-baseline.json');

function walkApiFiles(dir: string): string[] {
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

function printList(title: string, items: string[]) {
  if (items.length === 0) return;
  console.log(`\n${title}`);
  for (const item of items) console.log(` - ${item}`);
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    writeBaseline: args.has('--write-baseline'),
    quietList: args.has('--quiet-list'),
  };
}

function readBaseline(): string[] {
  if (!fs.existsSync(baselineFile)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    if (!Array.isArray(parsed?.missingInSpec)) return [];
    return parsed.missingInSpec.filter((v: unknown) => typeof v === 'string');
  } catch {
    return [];
  }
}

function writeBaseline(missingInSpec: string[]) {
  const payload = {
    generatedAt: new Date().toISOString(),
    missingInSpec: [...missingInSpec].sort(),
  };
  fs.mkdirSync(path.dirname(baselineFile), { recursive: true });
  fs.writeFileSync(baselineFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function main() {
  const args = parseArgs();
  const spec = await getOpenApiSpec();
  const specPaths = Object.keys(spec?.paths ?? {});
  const specPathSet = new Set(specPaths.map(normalizeRoute));

  const fileRoutes = walkApiFiles(apiRoot).map(filePathToRoute);
  const fileRouteSet = new Set(fileRoutes.map(normalizeRoute));

  const missingInFilesystem = specPaths.filter((p) => !fileRouteSet.has(normalizeRoute(p)));
  const missingInSpec = fileRoutes.filter((r) => !specPathSet.has(normalizeRoute(r)));
  const baselineMissing = readBaseline();
  const baselineSet = new Set(baselineMissing);
  const newMissingInSpec = missingInSpec.filter((r) => !baselineSet.has(r));
  const resolvedFromBaseline = baselineMissing.filter((r) => !missingInSpec.includes(r));

  console.log('OpenAPI route sync report');
  console.log(` - documented paths: ${specPaths.length}`);
  console.log(` - file routes: ${fileRoutes.length}`);
  console.log(` - missing in spec (current): ${missingInSpec.length}`);
  console.log(` - missing in spec (baseline): ${baselineMissing.length}`);
  console.log(` - newly missing vs baseline: ${newMissingInSpec.length}`);
  console.log(` - resolved vs baseline: ${resolvedFromBaseline.length}`);

  printList('Documented but missing file route:', missingInFilesystem);
  if (!args.quietList) {
    printList('File route exists but missing in OpenAPI:', missingInSpec);
  }

  if (args.writeBaseline) {
    writeBaseline(missingInSpec);
    console.log(`\nBaseline written: ${path.relative(repoRoot, baselineFile)}`);
  }

  if (missingInFilesystem.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (newMissingInSpec.length > 0 && !args.writeBaseline) {
    printList('New undocumented routes (regression):', newMissingInSpec);
    process.exitCode = 1;
    return;
  }

  if (missingInSpec.length > 0) {
    console.log(
      '\nOpenAPI kapsamı genişletilebilir: mevcut gap baseline ile izleniyor; yeni gap eklenirse gate fail olur.'
    );
  }

  console.log('\nNo route drift detected.');
}

main().catch((error: Error) => {
  console.error('Route sync failed:', error.message);
  process.exitCode = 1;
});
