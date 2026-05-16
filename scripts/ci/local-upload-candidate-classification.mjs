#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const parityPath = path.join(docsDir, 'local-upload-parity-report.json');
const statePath = path.join(docsDir, 'local-upload-candidate-state.json');
const outJson = path.join(docsDir, 'local-upload-candidate-classification.json');
const outMd = path.join(docsDir, 'local-upload-candidate-classification.md');

const now = new Date();
const observeDays = Number.parseInt(process.env.LOCAL_UPLOAD_OBSERVE_DAYS || '30', 10);
const archiveDays = Number.parseInt(process.env.LOCAL_UPLOAD_ARCHIVE_CANDIDATE_DAYS || '60', 10);

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function statSafe(rel) {
  try {
    return fs.statSync(path.join(root, rel));
  } catch {
    return null;
  }
}

function ageDays(stat) {
  if (!stat) return null;
  return Number(((now.getTime() - stat.mtimeMs) / 86400000).toFixed(1));
}

function observedAgeDays(firstSeenAt) {
  const parsed = Date.parse(firstSeenAt || '');
  if (Number.isNaN(parsed)) return 0;
  return Number(((now.getTime() - parsed) / 86400000).toFixed(1));
}

function classify(candidate, ownership, stateItem) {
  const stat = statSafe(candidate.path);
  const mtimeAge = ageDays(stat);
  const age = observedAgeDays(stateItem?.firstSeenAt);
  const bucket = candidate.path.split('/')[2] || 'root';
  const owner = ownership.get(bucket);
  const ownershipKnown = Boolean(owner && !String(owner.owner || '').includes('unclassified'));

  if (mtimeAge === null) {
    return { state: 'observed', reason: 'file stat unavailable', ageDays: age, mtimeAgeDays: null };
  }
  if (!ownershipKnown) {
    return {
      state: 'observed',
      reason: 'bucket ownership is not classified',
      ageDays: age,
      mtimeAgeDays: mtimeAge,
    };
  }
  if (age < observeDays) {
    return {
      state: 'observed',
      reason: `first observed less than ${observeDays} days ago`,
      ageDays: age,
      mtimeAgeDays: mtimeAge,
    };
  }
  if (age < archiveDays) {
    return {
      state: 'archive_candidate',
      reason: `unreferenced for observation window; first observed less than ${archiveDays} days ago`,
      ageDays: age,
      mtimeAgeDays: mtimeAge,
    };
  }
  return {
    state: 'deletable_review',
    reason: 'manual delete review allowed after source/DB/schema/OG checks',
    ageDays: age,
    mtimeAgeDays: mtimeAge,
  };
}

const parity = readJsonSafe(parityPath);
if (!parity) {
  console.error('local-upload-candidate-classification: missing docs/local-upload-parity-report.json');
  process.exit(1);
}

const ownership = new Map((parity.ownershipModel || []).map((item) => [item.bucket, item]));
const candidates = parity.unreferencedCandidateInventory || parity.unreferencedCandidates || [];
const previousState = readJsonSafe(statePath) || { candidates: {} };
const stateCandidates = previousState.candidates || {};
const currentPaths = new Set(candidates.map((candidate) => candidate.path));

const items = candidates.map((candidate) => {
  const bucket = candidate.path.split('/')[2] || 'root';
  const owner = ownership.get(bucket) || null;
  const previous = stateCandidates[candidate.path] || {};
  const stateItem = {
    firstSeenAt: previous.firstSeenAt || now.toISOString(),
    lastSeenAt: now.toISOString(),
    bucket,
    owner: owner?.owner || 'unclassified',
    sizeKb: candidate.sizeKb,
    sizeMb: candidate.sizeMb,
  };
  const result = classify(candidate, ownership, stateItem);
  stateCandidates[candidate.path] = {
    ...stateItem,
    lastState: result.state,
    lastReason: result.reason,
  };

  return {
    path: candidate.path,
    bucket,
    sizeKb: candidate.sizeKb,
    sizeMb: candidate.sizeMb,
    state: result.state,
    reason: result.reason,
    ageDays: result.ageDays,
    mtimeAgeDays: result.mtimeAgeDays,
    firstSeenAt: stateItem.firstSeenAt,
    lastSeenAt: stateItem.lastSeenAt,
    owner: owner?.owner || 'unclassified',
    requiredChecks: [
      'source /uploads reference scan',
      'DB text/json media reference scan',
      'OG/schema/sitemap usage review',
      'bucket owner approval',
      'rollback/restore path',
    ],
  };
});

for (const [candidatePath, item] of Object.entries(stateCandidates)) {
  if (!currentPaths.has(candidatePath)) {
    stateCandidates[candidatePath] = {
      ...item,
      retiredAt: item.retiredAt || now.toISOString(),
      lastState: 'retired',
    };
  }
}

const summary = items.reduce(
  (acc, item) => {
    acc.total += 1;
    acc[item.state] = (acc[item.state] || 0) + 1;
    acc.byBucket[item.bucket] = (acc.byBucket[item.bucket] || 0) + 1;
    return acc;
  },
  { total: 0, observed: 0, archive_candidate: 0, deletable_review: 0, byBucket: {} },
);

const report = {
  generatedAt: now.toISOString(),
  status: parity.status === 'blocked' ? 'blocked' : items.length > 0 ? 'review' : 'empty',
  source: 'docs/local-upload-parity-report.json',
  policy: {
    automaticDeleteAllowed: false,
    observeDays,
    archiveCandidateDays: archiveDays,
    ageSource: 'firstSeenAt',
    stateFile: 'docs/local-upload-candidate-state.json',
  },
  summary,
  items,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(
  statePath,
  `${JSON.stringify(
    {
      generatedAt: now.toISOString(),
      source: 'docs/local-upload-parity-report.json',
      activeCount: currentPaths.size,
      retainedCount: Object.keys(stateCandidates).length,
      candidates: stateCandidates,
    },
    null,
    2,
  )}\n`,
  'utf8',
);
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Local Upload Candidate Classification',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Automatic delete allowed: ${report.policy.automaticDeleteAllowed ? 'yes' : 'no'}`,
    `- Total candidates: ${summary.total}`,
    `- Observed: ${summary.observed}`,
    `- Archive candidate: ${summary.archive_candidate}`,
    `- Deletable review: ${summary.deletable_review}`,
    `- Age source: firstSeenAt state (${path.relative(root, statePath).replace(/\\/g, '/')})`,
    '',
    '## By Bucket',
    '',
    '| Bucket | Count |',
    '|---|---:|',
    ...Object.entries(summary.byBucket).sort((a, b) => b[1] - a[1]).map(([bucket, count]) => `| ${bucket} | ${count} |`),
    '',
    '## Top Review Queue',
    '',
    '| State | Path | First Seen Age Days | Mtime Age Days | Size KB | Owner | Reason |',
    '|---|---|---:|---:|---:|---|---|',
    ...items.slice(0, 100).map((item) => `| ${item.state} | \`${item.path}\` | ${item.ageDays ?? ''} | ${item.mtimeAgeDays ?? ''} | ${item.sizeKb ?? ''} | ${item.owner} | ${item.reason} |`),
    '',
    'Not: Bu rapor dosya silmez. `deletable_review` sadece manuel PR ve geri alma planı sonrası değerlendirilebilir.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `local-upload-candidate-classification: ${report.status.toUpperCase()} (${summary.total} candidates, ${summary.archive_candidate} archive, ${summary.deletable_review} delete-review)`,
);
