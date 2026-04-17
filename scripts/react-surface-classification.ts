import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildReactSurfaceClassificationMarkdown,
  classifyReactSurface,
} from '../src/lib/react-surface-classification';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');
const reportJsonPath = path.join(repoRoot, 'docs', 'reports', 'react-surface-classification.json');
const reportMdPath = path.join(repoRoot, 'docs', 'reports', 'react-surface-classification.md');

const walk = (dir: string, files: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
};

const toRepoPath = (filePath: string) => path.relative(repoRoot, filePath).replace(/\\/g, '/');
const fromRepoPath = (filePath: string) => path.join(repoRoot, filePath.replace(/\//g, path.sep));
const normalizeImport = (value: string) => value.split('?')[0]?.split('#')[0] ?? value;

const sourceFiles = walk(srcRoot).filter((file) => /\.(astro|ts|tsx|js|mjs|cjs)$/.test(file));
const sourceRepoFiles = sourceFiles.map(toRepoPath);
const sourceFileSet = new Set(sourceRepoFiles);
const tsxFiles = sourceRepoFiles.filter((file) => file.endsWith('.tsx')).sort();
const nonTestRuntimeRoots = sourceRepoFiles
  .filter((file) => !file.endsWith('.tsx'))
  .filter((file) => !/\.test\.ts$/.test(file))
  .filter((file) => !file.includes('/__tests__/'));

const resolveImport = (fromFile: string, specifier: string): string | null => {
  const cleaned = normalizeImport(specifier);
  if (!cleaned) return null;

  const candidates: string[] = [];
  if (cleaned.startsWith('@/')) {
    const base = `src/${cleaned.slice(2)}`;
    candidates.push(base, `${base}.ts`, `${base}.tsx`, `${base}.astro`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.astro`);
  } else if (cleaned.startsWith('.')) {
    const base = toRepoPath(path.resolve(path.dirname(fromRepoPath(fromFile)), cleaned));
    candidates.push(base, `${base}.ts`, `${base}.tsx`, `${base}.astro`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.astro`);
  }

  for (const candidate of candidates) {
    if (sourceFileSet.has(candidate)) return candidate;
  }

  return null;
};

const importRegex = /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const outgoing = new Map<string, string[]>();
for (const file of sourceRepoFiles) {
  if (file.endsWith('.test.ts') || file.includes('/__tests__/')) continue;
  const abs = fromRepoPath(file);
  const text = fs.readFileSync(abs, 'utf8');
  const refs: string[] = [];
  for (const match of text.matchAll(importRegex)) {
    const specifier = match[1] ?? match[2];
    if (!specifier) continue;
    const resolved = resolveImport(file, specifier);
    if (resolved) refs.push(resolved);
  }
  outgoing.set(file, refs);
}

const reachableTsx = new Set<string>();
const queue = [...nonTestRuntimeRoots];
const seen = new Set<string>();
while (queue.length > 0) {
  const current = queue.shift()!;
  if (seen.has(current)) continue;
  seen.add(current);
  const refs = outgoing.get(current) ?? [];
  for (const ref of refs) {
    if (ref.endsWith('.tsx')) reachableTsx.add(ref);
    if (!seen.has(ref)) queue.push(ref);
  }
}

const keepBlockers = sourceRepoFiles
  .filter((file) => file.endsWith('.ts'))
  .filter((file) => /src\/(hooks|lib)\//.test(file))
  .filter((file) => {
    const text = fs.readFileSync(fromRepoPath(file), 'utf8');
    return text.includes("from 'react'") || text.includes('from "react"');
  })
  .sort();

const serverOnly: string[] = [];
const dead: string[] = [];
const migrate: string[] = [];

for (const file of tsxFiles) {
  if (reachableTsx.has(file)) {
    migrate.push(file);
  } else {
    dead.push(file);
  }
}

const runtimeRoots = ['astro.config.mjs'];

const report = classifyReactSurface({
  runtimeRoots,
  serverOnly,
  dead,
  migrate,
  keep: keepBlockers,
});

fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(reportMdPath, buildReactSurfaceClassificationMarkdown(report), 'utf8');

console.log(
  `react-surface-classification: OK (tsx=${report.tsxCount}, server_only=${report.serverOnlyCount}, dead=${report.deadCount}, migrate=${report.migrateCount}, keep=${report.keepCount})`,
);
