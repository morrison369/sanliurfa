#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const inputJson = path.join(docsDir, 'local-upload-parity-report.json');
const outJson = path.join(docsDir, 'local-upload-bucket-quota-report.json');
const outMd = path.join(docsDir, 'local-upload-bucket-quota-report.md');

const defaultBucketSoftLimitsMb = {
  places: 180,
  blogs: 90,
  historical: 30,
  recipes: 30,
  events: 30,
  root: 20,
};

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function statusFor(percent) {
  if (percent >= 95) return 'blocker';
  if (percent >= 85) return 'review';
  if (percent >= 70) return 'advisory';
  return 'ok';
}

const parity = readJsonSafe(inputJson);
const buckets = Array.isArray(parity?.byBucket) ? parity.byBucket : [];
const bucketQuotas = buckets.map((bucket) => {
  const softLimitMb =
    Number.parseFloat(process.env[`LOCAL_UPLOAD_${String(bucket.key).toUpperCase()}_SOFT_LIMIT_MB`] || '') ||
    defaultBucketSoftLimitsMb[bucket.key] ||
    25;
  const usedPercent = Number(((Number(bucket.totalMb || 0) / softLimitMb) * 100).toFixed(1));
  return {
    bucket: bucket.key,
    totalMb: bucket.totalMb || 0,
    fileCount: bucket.fileCount || 0,
    candidateCount: bucket.candidateCount || 0,
    softLimitMb,
    usedPercent,
    status: statusFor(usedPercent),
  };
});

const blockerCount = bucketQuotas.filter((item) => item.status === 'blocker').length;
const reviewCount = bucketQuotas.filter((item) => item.status === 'review').length;
const advisoryCount = bucketQuotas.filter((item) => item.status === 'advisory').length;
const report = {
  generatedAt: new Date().toISOString(),
  status: !parity ? 'missing_parity' : blockerCount > 0 ? 'blocked' : reviewCount > 0 || advisoryCount > 0 ? 'review' : 'ok',
  source: 'docs/local-upload-parity-report.json',
  policy: {
    storageModel: 'local_filesystem_only',
    automaticDeleteAllowed: false,
    thresholds: {
      advisoryPercent: 70,
      reviewPercent: 85,
      blockerPercent: 95,
    },
  },
  summary: {
    bucketCount: bucketQuotas.length,
    blockerCount,
    reviewCount,
    advisoryCount,
  },
  buckets: bucketQuotas,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Local Upload Bucket Quota Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Storage model: ${report.policy.storageModel}`,
    `- Automatic delete allowed: ${report.policy.automaticDeleteAllowed ? 'yes' : 'no'}`,
    '',
    '| Bucket | Status | Used MB | Soft Limit MB | Used % | Files | Candidates |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...bucketQuotas.map(
      (item) =>
        `| ${item.bucket} | ${item.status} | ${item.totalMb} | ${item.softLimitMb} | ${item.usedPercent} | ${item.fileCount} | ${item.candidateCount} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `local-upload-bucket-quota-report: ${report.status.toUpperCase()} (${bucketQuotas.length} buckets, ${blockerCount} blockers)`,
);
process.exit(blockerCount > 0 ? 1 : 0);
