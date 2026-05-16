#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'db-manual-decision-readiness-report.json');
const outMd = path.join(docsDir, 'db-manual-decision-readiness-report.md');

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const cadence = readJsonSafe('docs/db-observation-cadence-report.json');
const plan = readJsonSafe('docs/db-p0-quarantine-plan.json');
const now = new Date();
const earliestActionAt = plan?.policy?.earliestActionAt || cadence?.summary?.earliestActionAt || null;
const actionWindowOpen = earliestActionAt ? now.getTime() >= Date.parse(earliestActionAt) : false;
const stableEnoughForAction = Boolean(cadence?.summary?.stableEnoughForAction);

const candidates = (plan?.candidates || []).map((item) => {
  const evidence = {
    observationWindowComplete: stableEnoughForAction && actionWindowOpen,
    runtimeReferencesClear: item.runtimeReferenceCount === 0,
    migrationSourceKnown: (item.migrationSources || []).length > 0,
    rollbackPlanRequired: true,
    ownerKnown: item.owner !== 'unclassified',
  };
  const missingEvidence = Object.entries(evidence)
    .filter(([, ok]) => ok !== true)
    .map(([key]) => key);
  return {
    table: item.table,
    owner: item.owner,
    status: missingEvidence.length === 0 ? 'ready_for_manual_pr' : 'waiting_for_evidence',
    missingEvidence,
    evidence,
    recommendedAction:
      missingEvidence.length === 0
        ? 'Open a manual quarantine PR with rollback SQL and owner approval.'
        : 'Continue observation; do not create destructive migration.',
  };
});

const runtimeHolds = (plan?.runtimeHolds || []).map((item) => ({
  table: item.table,
  owner: item.owner,
  status: 'runtime_hold',
  runtimeReferenceCount: item.runtimeReferenceCount,
  recommendedAction: item.requiredAction || 'Remove/migrate runtime references before any retirement decision.',
}));

const report = {
  generatedAt: now.toISOString(),
  status: candidates.some((item) => item.status === 'ready_for_manual_pr') ? 'manual_review_ready' : 'waiting',
  policy: {
    automaticDropAllowed: false,
    automaticMigrationGenerationAllowed: false,
    earliestActionAt,
    actionWindowOpen,
  },
  summary: {
    candidateCount: candidates.length,
    readyForManualPrCount: candidates.filter((item) => item.status === 'ready_for_manual_pr').length,
    waitingForEvidenceCount: candidates.filter((item) => item.status === 'waiting_for_evidence').length,
    runtimeHoldCount: runtimeHolds.length,
  },
  candidates,
  runtimeHolds,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# DB Manual Decision Readiness Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Earliest action at: ${report.policy.earliestActionAt || 'unknown'}`,
    `- Action window open: ${report.policy.actionWindowOpen ? 'yes' : 'no'}`,
    `- Automatic drop allowed: ${report.policy.automaticDropAllowed ? 'yes' : 'no'}`,
    '',
    '## Candidates',
    '',
    '| Table | Owner | Status | Missing Evidence | Recommended Action |',
    '|---|---|---|---|---|',
    ...candidates.map(
      (item) =>
        `| \`${item.table}\` | ${item.owner} | ${item.status} | ${item.missingEvidence.join(', ') || 'none'} | ${item.recommendedAction} |`,
    ),
    '',
    '## Runtime Holds',
    '',
    '| Table | Owner | Runtime Refs | Action |',
    '|---|---|---:|---|',
    ...runtimeHolds.map(
      (item) => `| \`${item.table}\` | ${item.owner} | ${item.runtimeReferenceCount} | ${item.recommendedAction} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `db-manual-decision-readiness-report: ${report.status.toUpperCase()} (${report.summary.readyForManualPrCount}/${report.summary.candidateCount} ready)`,
);
