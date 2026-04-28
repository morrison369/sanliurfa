#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function walk(dir) {
  const absolute = path.join(root, dir);
  const files = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      files.push(...walk(rel));
      continue;
    }
    if (/\.(astro|tsx|ts)$/.test(entry.name)) files.push(rel);
  }
  return files;
}

const files = [
  ...walk('src/pages/admin'),
  ...walk('src/components/admin'),
].filter((file) => !file.includes('__tests__'));
const forbidden = [
  'Release Evidence',
  'Env Doctor',
  'Ops Last Run',
  'Site Doctor',
  'Critical Pages',
  'Image Providers',
  'System Health',
  'Provider Health',
  'Security Headers',
];

const findings = [];
for (const file of files) {
  const text = readFileSync(path.join(root, file), 'utf8');
  for (const phrase of forbidden) {
    if (text.includes(phrase)) findings.push({ file, phrase });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: findings.length > 0 ? 'blocked' : 'ok',
  checkedFiles: files,
  findings,
};

mkdirSync(path.join(root, 'docs'), { recursive: true });
writeFileSync(
  path.join(root, 'docs', 'admin-turkish-ui-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);
writeFileSync(
  path.join(root, 'docs', 'admin-turkish-ui-report.md'),
  [
    '# Admin Turkish UI Report',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Checked Files: ${files.length}`,
    `- Findings: ${findings.length}`,
    '',
    '| File | Phrase |',
    '|---|---|',
    ...findings.map((item) => `| \`${item.file}\` | ${item.phrase} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Admin Turkish UI gate: ${report.status}`);
if (findings.length > 0) process.exit(1);
