#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

type Report = {
  generatedAt?: string;
  totalMissing?: number;
  byCluster?: Record<string, { total: number; withSource: number; withoutSource: number }>;
};

const root = process.cwd();
const currentPath = path.join(root, 'docs', 'openapi-p0-closure-report.json');
const baselinePath = path.join(root, 'docs', 'openapi-p0-regression-baseline.json');

function readJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function sumWithSource(report: Report): number {
  const clusters = report.byCluster || {};
  return Object.values(clusters).reduce((acc, item) => acc + Number(item.withSource || 0), 0);
}

function main() {
  const current = readJson<Report>(currentPath);
  const baseline = readJson<Report>(baselinePath);

  const currentWithSource = sumWithSource(current);
  const baselineWithSource = sumWithSource(baseline);
  const currentMissing = Number(current.totalMissing || 0);
  const baselineMissing = Number(baseline.totalMissing || 0);

  console.log('OpenAPI P0 regression gate');
  console.log(`- baseline withSource: ${baselineWithSource}`);
  console.log(`- current withSource: ${currentWithSource}`);
  console.log(`- baseline totalMissing: ${baselineMissing}`);
  console.log(`- current totalMissing: ${currentMissing}`);

  if (currentWithSource > baselineWithSource) {
    console.error(
      `FAILED: withSource regression detected (baseline=${baselineWithSource}, current=${currentWithSource})`,
    );
    process.exit(1);
  }

  if (currentMissing > baselineMissing) {
    console.error(
      `FAILED: totalMissing regression detected (baseline=${baselineMissing}, current=${currentMissing})`,
    );
    process.exit(1);
  }

  console.log('OK: no regression on OpenAPI P0 metrics');
}

main();
