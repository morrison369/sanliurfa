#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'unit-skip-report.json');
const outMd = path.join(docsDir, 'unit-skip-report.md');
const scanDirs = ['src/lib/__tests__'];
const skipPattern = /\b(?:it|test|describe)\.(?:skip|skipIf)\b|test\.skip\s*\(/g;

function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) return walk(rel);
    if (!/\.(test|spec)\.(ts|tsx|js|mjs)$/.test(entry.name)) return [];
    return [rel];
  });
}

function classifyReason(line) {
  if (/skipIf\(!sizes\)|bundle/i.test(line)) return 'build artifact dependent';
  if (/migration|schema/i.test(line)) return 'environment schema dependent';
  if (/auth|admin|token|bypass|401|403/i.test(line)) return 'auth or environment dependent';
  if (/seed|database|messages|blog post/i.test(line)) return 'seed data dependent';
  if (/test\.skip\(\)/.test(line)) return 'undocumented skip';
  return 'documented conditional skip';
}

const items = [];
for (const rel of scanDirs.flatMap(walk)) {
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
const unitTestReport = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'docs/unit-test-report.json'), 'utf8'));
  } catch {
    return null;
  }
})();

const report = {
  generatedAt: new Date().toISOString(),
  status: undocumented.length > 0 ? 'review' : 'ok',
  source: 'static skip declaration scan',
  observedUnitSkips: {
    testFiles: unitTestReport?.testFiles?.skipped ?? 0,
    tests: unitTestReport?.tests?.skipped ?? 0,
  },
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
    '# Unit Skip Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Observed skipped test files: ${report.observedUnitSkips.testFiles}`,
    `- Observed skipped tests: ${report.observedUnitSkips.tests}`,
    `- Static skip declarations: ${report.summary.declarationCount}`,
    `- Undocumented declarations: ${report.summary.undocumentedCount}`,
    '',
    '## By Reason',
    '',
    '| Reason | Count |',
    '|---|---:|',
    ...Object.entries(byReason).map(([reason, count]) => `| ${reason} | ${count} |`),
    '',
    '## Declarations',
    '',
    '| File | Line | Reason | Expression |',
    '|---|---:|---|---|',
    ...items.map((item) => `| \`${item.file}\` | ${item.line} | ${item.reason} | \`${item.expression.replaceAll('|', '\\|')}\` |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `unit-skip-report: ${report.status.toUpperCase()} (${items.length} declarations, ${undocumented.length} undocumented)`,
);
