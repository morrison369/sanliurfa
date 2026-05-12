#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'src', 'components', 'home');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.astro'));
const report = [];
const maxAnyThreshold = 200;

for (const file of files) {
  const raw = fs.readFileSync(path.join(dir, file), 'utf8');
  const count = (raw.match(/\bany\b/g) || []).length;
  report.push({ file, anyCount: count });
}

const outPath = path.join(root, 'docs', 'home-any-report.json');
const totalAny = report.reduce((sum, item) => sum + item.anyCount, 0);
const payload = {
  generatedAt: new Date().toISOString(),
  maxAnyThreshold,
  totalAny,
  pass: totalAny <= maxAnyThreshold,
  report,
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`home-any-report: wrote ${path.relative(root, outPath)}`);
if (!payload.pass) {
  console.error(`home-any-report: FAIL totalAny=${totalAny} threshold=${maxAnyThreshold}`);
  process.exit(1);
}
