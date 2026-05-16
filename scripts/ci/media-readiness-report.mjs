#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'media-readiness-report.json');
const outMd = path.join(docsDir, 'media-readiness-report.md');

function readJsonSafe(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
  } catch {
    return null;
  }
}

const localStorageGate = readJsonSafe('docs/local-media-storage-gate.json');
const uploadParity = readJsonSafe('docs/local-upload-parity-report.json');
const bucketQuota = readJsonSafe('docs/local-upload-bucket-quota-report.json');
const uploadClassification = readJsonSafe('docs/local-upload-candidate-classification.json');
const archiveCandidates = readJsonSafe('docs/local-upload-archive-candidates.json');
const imageIntegrity = readJsonSafe('docs/static-image-integrity-report.json');

const checks = [
  {
    name: 'Local storage policy',
    ok: localStorageGate?.status === 'ok' &&
      localStorageGate?.localStorageOnly === true &&
      localStorageGate?.externalObjectStorageConfigured === false,
    detail: `local-only=${localStorageGate?.localStorageOnly ? 'yes' : 'no'}, external-object-storage=${localStorageGate?.externalObjectStorageConfigured ? 'yes' : 'no'}`,
    artifact: 'docs/local-media-storage-gate.json',
  },
  {
    name: 'Upload reference parity',
    ok: uploadParity?.status === 'ok' &&
      (uploadParity?.summary?.missingReferencedFileCount ?? 0) === 0,
    detail: `${uploadParity?.summary?.uploadFileCount ?? 0} uploads, ${uploadParity?.summary?.missingReferencedFileCount ?? 0} missing refs, ${uploadParity?.summary?.unreferencedCandidateCount ?? 0} unreferenced candidates`,
    artifact: 'docs/local-upload-parity-report.json',
  },
  {
    name: 'Bucket quota',
    ok: bucketQuota?.status === 'ok',
    detail: `${bucketQuota?.summary?.bucketCount ?? 0} buckets, blockers=${bucketQuota?.summary?.blockerCount ?? 0}, review=${bucketQuota?.summary?.reviewCount ?? 0}`,
    artifact: 'docs/local-upload-bucket-quota-report.json',
  },
  {
    name: 'Upload archive queue',
    ok: (archiveCandidates?.summary?.deletableReview ?? 0) === 0,
    detail: `${archiveCandidates?.summary?.total ?? 0} total, ${archiveCandidates?.summary?.archiveCandidate ?? 0} archive, ${archiveCandidates?.summary?.deletableReview ?? 0} delete-review`,
    artifact: 'docs/local-upload-archive-candidates.json',
  },
  {
    name: 'Static image integrity',
    ok: imageIntegrity?.status === 'pass' &&
      (imageIntegrity?.summary?.failed ?? 0) === 0 &&
      (imageIntegrity?.summary?.review ?? 0) === 0,
    detail: `${imageIntegrity?.summary?.scanned ?? 0} public images, failed=${imageIntegrity?.summary?.failed ?? 0}, review=${imageIntegrity?.summary?.review ?? 0}`,
    artifact: 'docs/static-image-integrity-report.json',
  },
];

const failed = checks.filter((check) => !check.ok);
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'review' : 'ok',
  policy: {
    localStorageOnly: true,
    cdnOrObjectStorageAllowed: false,
    automaticDeleteAllowed: false,
  },
  summary: {
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    uploadFiles: uploadParity?.summary?.uploadFileCount ?? 0,
    publicImages: imageIntegrity?.summary?.scanned ?? 0,
  },
  checks,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Media Readiness Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Policy: local storage only; CDN/object storage yok; otomatik silme yok`,
    '',
    '| Check | Status | Detail | Artifact |',
    '|---|---|---|---|',
    ...checks.map((check) => `| ${check.name} | ${check.ok ? 'ok' : 'review'} | ${check.detail} | \`${check.artifact}\` |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`media-readiness-report: ${report.status.toUpperCase()} (${report.summary.passed}/${report.summary.checks})`);
process.exitCode = report.status === 'ok' ? 0 : 1;
