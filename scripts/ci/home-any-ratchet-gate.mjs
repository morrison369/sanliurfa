#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'docs', 'home-any-report.json');
const baselinePath = path.join(root, 'docs', 'home-any-baseline.json');

if (!fs.existsSync(reportPath)) {
  console.error('home-any-ratchet-gate: missing docs/home-any-report.json');
  process.exit(1);
}
if (!fs.existsSync(baselinePath)) {
  console.error('home-any-ratchet-gate: missing docs/home-any-baseline.json');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const totalAny = Number(report.totalAny || 0);
const maxTotalAny = Number(baseline.maxTotalAny || 0);

if (totalAny > maxTotalAny) {
  console.error(`home-any-ratchet-gate: FAIL totalAny=${totalAny} baseline=${maxTotalAny}`);
  process.exit(1);
}

console.log(`home-any-ratchet-gate: PASS totalAny=${totalAny} baseline=${maxTotalAny}`);
