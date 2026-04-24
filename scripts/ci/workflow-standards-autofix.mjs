#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const workflowsDir = join(root, '.github', 'workflows');
const isWrite = process.argv.includes('--write');

const files = readdirSync(workflowsDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
const changed = [];

for (const name of files) {
  const full = join(workflowsDir, name);
  const original = readFileSync(full, 'utf8');

  let next = original
    .replace(/actions\/upload-artifact@v3/g, 'actions/upload-artifact@v4')
    .replace(/actions\/download-artifact@v3/g, 'actions/download-artifact@v4')
    .replace(/actions\/cache@v3/g, 'actions/cache@v4')
    .replace(
      /name:\s*workflow-standards-report(?!-\$\{\{\s*github\.job\s*\}\})/g,
      'name: workflow-standards-report-${{ github.job }}',
    );

  // Normalize duplicated gate/report steps into one verify step.
  const eol = next.includes('\r\n') ? '\r\n' : '\n';
  const lines = next.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const gateMatch = line.match(/^(\s*)- name: Workflow standards gate\s*$/);
    if (!gateMatch) {
      out.push(line);
      continue;
    }
    const indent = gateMatch[1];
    const gateRun = lines[i + 1] ?? '';
    const maybeBlank = lines[i + 2] ?? '';
    const reportName = lines[i + 3] ?? '';
    const reportRun = lines[i + 4] ?? '';
    const gateRunOk = gateRun.trim() === 'run: npm run workflow:standards:gate';
    const reportNameOk = reportName.trim() === '- name: Workflow standards report';
    const reportRunOk = reportRun.trim() === 'run: npm run workflow:standards:report';
    if (gateRunOk && reportNameOk && reportRunOk) {
      out.push(`${indent}- name: Workflow standards verify`);
      out.push(`${indent}  run: npm run workflow:standards:verify`);
      i += maybeBlank.trim() === '' ? 4 : 3;
      continue;
    }
    out.push(line);
  }
  next = out.join(eol);

  if (next !== original) {
    changed.push(name);
    if (isWrite) {
      writeFileSync(full, next);
    }
  }
}

if (changed.length === 0) {
  console.log('[workflow-standards-autofix] no changes needed');
  process.exit(0);
}

console.log(
  `[workflow-standards-autofix] ${isWrite ? 'updated' : 'would update'} ${changed.length} workflow file(s):`,
);
for (const name of changed) console.log(`- ${name}`);

if (!isWrite) {
  console.error('[workflow-standards-autofix] drift detected. Run: npm run workflow:standards:autofix');
  process.exit(1);
}
