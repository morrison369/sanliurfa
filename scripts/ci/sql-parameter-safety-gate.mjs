#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'sql-parameter-safety-gate.json');
const outMd = path.join(docsDir, 'sql-parameter-safety-gate.md');
const scanRoots = ['src', 'scripts'];
const unsafePatterns = [
  {
    id: 'quoted_interval_bind_parameter',
    regex: /INTERVAL\s+['"`]\$[0-9]+[^'"`]*['"`]/i,
    guidance:
      "PostgreSQL bind parametresi string literal içinde çalışmaz; ($2::int * INTERVAL '1 day') formunu kullan.",
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (/\.(astro|cjs|cts|js|jsx|mjs|mts|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const findings = [];
for (const relRoot of scanRoots) {
  for (const file of walk(path.join(root, relRoot))) {
    const relativePath = path.relative(root, file).replaceAll(path.sep, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of unsafePatterns) {
        if (pattern.regex.test(line)) {
          findings.push({
            pattern: pattern.id,
            file: relativePath,
            line: index + 1,
            excerpt: line.trim().slice(0, 220),
            guidance: pattern.guidance,
          });
        }
      }
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: findings.length === 0 ? 'ok' : 'blocked',
  summary: {
    scannedRoots: scanRoots,
    findingCount: findings.length,
  },
  findings,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(
  outMd,
  [
    '# SQL Parameter Safety Gate',
    '',
    `- Durum: ${report.status}`,
    `- Bulgu: ${findings.length}`,
    '',
    ...findings.map((item) => `- ${item.file}:${item.line} ${item.pattern} - ${item.guidance}`),
    '',
  ].join('\n'),
);

console.log(`sql-parameter-safety-gate: ${report.status.toUpperCase()} findings=${findings.length}`);
if (report.status !== 'ok') process.exit(1);
