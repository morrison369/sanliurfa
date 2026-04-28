#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = ['src/pages/admin/system-health.astro'];
const forbidden = [
  'Release Evidence',
  'Env Doctor',
  'Ops Last Run',
  'Site Doctor',
  'Critical Pages',
  'Image Providers',
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
