#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'e2e-skip-report.json');
const outMd = path.join(docsDir, 'e2e-skip-report.md');
const skipPattern = /\b(?:test|describe)\.(?:skip|skipIf)\b|test\.skip\s*\(/g;

function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) return walk(rel);
    if (!/\.(spec|test)\.(ts|tsx|js|mjs)$/.test(entry.name)) return [];
    return [rel];
  });
}

function classifyReason(line) {
  if (/auth|token|401|403|bypass/i.test(line)) return 'auth or environment dependent';
  if (/seed|database|messages|blog post/i.test(line)) return 'seed data dependent';
  if (/migration|schema/i.test(line)) return 'environment schema dependent';
  if (/setup|unavailable|başarısız/i.test(line)) return 'runtime setup dependent';
  if (/test\.skip\(\)/.test(line)) return 'undocumented skip';
  return 'documented conditional skip';
}

const items = [];
for (const rel of walk('e2e')) {
  const lines = fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    skipPattern.lastIndex = 0;
    if (!skipPattern.test(line)) return;
    skipPattern.lastIndex = 0;
    items.push({
      file: rel,
      line: index + 1,
      expression: line.trim(),
      reason: classifyReason(line),
    });
  });
}

const byReason = items.reduce((acc, item) => {
  acc[item.reason] = (acc[item.reason] || 0) + 1;
  return acc;
}, {});
const undocumented = items.filter((item) => item.reason === 'undocumented skip');
const report = {
  generatedAt: new Date().toISOString(),
  status: undocumented.length > 0 ? 'review' : 'ok',
  source: 'e2e static skip declaration scan',
  summary: {
    declarationCount: items.length,
    undocumentedCount: undocumented.length,
    byReason,
  },
  items,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# E2E Skip Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Static skip declarations: ${report.summary.declarationCount}`,
    `- Undocumented declarations: ${report.summary.undocumentedCount}`,
    '',
    '| Reason | Count |',
    '|---|---:|',
    ...Object.entries(byReason).map(([reason, count]) => `| ${reason} | ${count} |`),
    '',
    '| File | Line | Reason | Expression |',
    '|---|---:|---|---|',
    ...items.map((item) => `| \`${item.file}\` | ${item.line} | ${item.reason} | \`${item.expression.replaceAll('|', '\\|')}\` |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `e2e-skip-report: ${report.status.toUpperCase()} (${items.length} declarations, ${undocumented.length} undocumented)`,
);
