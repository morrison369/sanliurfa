#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const sourcePath = path.join(docsDir, 'local-upload-candidate-classification.json');
const outJson = path.join(docsDir, 'local-upload-archive-candidates.json');
const outMd = path.join(docsDir, 'local-upload-archive-candidates.md');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

const classification = readJsonSafe(sourcePath);
if (!classification) {
  console.error('local-upload-archive-candidates: missing docs/local-upload-candidate-classification.json');
  process.exit(1);
}

const candidates = (classification.items || []).filter((item) =>
  ['archive_candidate', 'deletable_review'].includes(item.state),
);
const byState = candidates.reduce((acc, item) => {
  acc[item.state] = (acc[item.state] || 0) + 1;
  return acc;
}, {});
const byBucket = candidates.reduce((acc, item) => {
  acc[item.bucket] = (acc[item.bucket] || 0) + 1;
  return acc;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  status: candidates.length > 0 ? 'action_required' : 'empty',
  source: 'docs/local-upload-candidate-classification.json',
  policy: {
    automaticDeleteAllowed: false,
    requiredAction: 'manual archive PR with owner approval and rollback path',
  },
  summary: {
    total: candidates.length,
    archiveCandidate: byState.archive_candidate || 0,
    deletableReview: byState.deletable_review || 0,
    byBucket,
  },
  candidates,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Local Upload Archive Candidates',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Automatic delete allowed: ${report.policy.automaticDeleteAllowed ? 'yes' : 'no'}`,
    `- Total archive PR candidates: ${report.summary.total}`,
    `- Archive candidate: ${report.summary.archiveCandidate}`,
    `- Deletable review: ${report.summary.deletableReview}`,
    '',
    '## By Bucket',
    '',
    '| Bucket | Count |',
    '|---|---:|',
    ...Object.entries(byBucket).map(([bucket, count]) => `| ${bucket} | ${count} |`),
    '',
    '## Queue',
    '',
    '| State | Path | First Seen Age Days | Owner | Required Action |',
    '|---|---|---:|---|---|',
    ...candidates
      .slice(0, 200)
      .map(
        (item) =>
          `| ${item.state} | \`${item.path}\` | ${item.ageDays ?? ''} | ${item.owner || 'unclassified'} | manual archive PR |`,
      ),
    '',
    'Not: Bu rapor dosya silmez. Aksiyon sadece manuel PR, sahip onayi ve geri alma plani ile yapilir.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `local-upload-archive-candidates: ${report.status.toUpperCase()} (${report.summary.total} candidates)`,
);
