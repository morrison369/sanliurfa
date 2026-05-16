#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'db-advisory-evidence-bundle.json');
const outMd = path.join(docsDir, 'db-advisory-evidence-bundle.md');

function readJsonSafe(rel, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

const observation = readJsonSafe('docs/db-retirement-observation-report.json', {});
const quarantine = readJsonSafe('docs/db-p0-quarantine-plan.json', {});
const cadence = readJsonSafe('docs/db-observation-cadence-report.json', {});
const manual = readJsonSafe('docs/db-manual-decision-readiness-report.json', {});
const indexPlan = readJsonSafe('docs/db-index-review-plan.json', {});
const prodCompare = readJsonSafe('docs/db-prod-version-compare-report.json', {});

const earliestActionAt =
  observation?.policy?.earliestActionAt ||
  quarantine?.policy?.earliestActionAt ||
  manual?.policy?.earliestActionAt ||
  null;
const actionWindowOpen = earliestActionAt ? Date.now() >= Date.parse(earliestActionAt) : false;
const quarantineCandidates = Array.isArray(quarantine?.candidates) ? quarantine.candidates : [];
const runtimeHolds = Array.isArray(quarantine?.runtimeHolds) ? quarantine.runtimeHolds : [];
const waitingCandidates = Array.isArray(manual?.candidates)
  ? manual.candidates.filter((item) => item.status !== 'ready_for_manual_pr')
  : quarantineCandidates;

const blockers = uniq([
  !actionWindowOpen ? 'observation-window-not-complete' : null,
  runtimeHolds.length > 0 ? 'runtime-references-present' : null,
  waitingCandidates.length > 0 ? 'manual-evidence-incomplete' : null,
]);

const decisions = [
  {
    area: 'p0-table-quarantine',
    decision: blockers.length === 0 ? 'manual-pr-review-ready' : 'continue-observation',
    destructiveActionAllowed: false,
    automaticActionAllowed: false,
    earliestActionAt,
    blockers,
  },
  {
    area: 'unused-indexes',
    decision: 'explain-review-only',
    destructiveActionAllowed: false,
    automaticActionAllowed: false,
    blockers: ['idx_scan-zero-alone-is-not-evidence'],
  },
];

const report = {
  generatedAt: new Date().toISOString(),
  status: blockers.length === 0 ? 'manual_review_ready' : 'observation_required',
  policy: {
    automaticDbDropAllowed: false,
    automaticIndexDropAllowed: false,
    destructiveActionsAllowed: false,
    localStorageOnly: true,
  },
  summary: {
    p0QuarantineCandidateCount: quarantineCandidates.length,
    runtimeHoldCount: runtimeHolds.length,
    observationSnapshots: cadence?.summary?.snapshotCount ?? observation?.snapshots?.count ?? 0,
    observationDaysRequired: cadence?.policy?.observationDays ?? observation?.policy?.observationDays ?? 14,
    missingObservationDays: cadence?.summary?.missingDays ?? null,
    earliestActionAt,
    actionWindowOpen,
    readyForManualPrCount: manual?.summary?.readyForManualPrCount ?? 0,
    waitingForEvidenceCount: manual?.summary?.waitingForEvidenceCount ?? waitingCandidates.length,
    reviewableIndexCount: indexPlan?.summary?.reviewableIndexCount ?? 0,
    sourceMigrationMatched: prodCompare?.summary?.appliedSourceMatchCount ?? null,
    sourceMigrationTotal: prodCompare?.summary?.sourceMigrationFileCount ?? null,
  },
  decisions,
  quarantineCandidates: quarantineCandidates.map((item) => ({
    table: item.table,
    owner: item.owner,
    blocker: item.blocker,
    runtimeReferenceCount: item.runtimeReferenceCount,
    migrationSources: item.migrationSources || [],
    replacementTables: item.replacementTables || [],
    requiredEvidence: item.requiredEvidence || [],
  })),
  runtimeHolds: runtimeHolds.map((item) => ({
    table: item.table,
    owner: item.owner,
    blocker: item.blocker,
    runtimeReferenceCount: item.runtimeReferenceCount,
    runtimeReferences: item.runtimeReferences || [],
    requiredAction: item.requiredAction,
  })),
  recommendedCommands: [
    'npm run -s db:retirement:observe',
    'npm run -s db:p0:quarantine:plan',
    'npm run -s db:observation:cadence',
    'npm run -s db:manual:decision:readiness',
    'npm run -s db:index:review:plan',
  ],
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# DB Advisory Evidence Bundle',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Automatic DB drop: ${report.policy.automaticDbDropAllowed ? 'yes' : 'no'}`,
    `- Automatic index drop: ${report.policy.automaticIndexDropAllowed ? 'yes' : 'no'}`,
    `- Quarantine candidates: ${report.summary.p0QuarantineCandidateCount}`,
    `- Runtime holds: ${report.summary.runtimeHoldCount}`,
    `- Observation: ${report.summary.observationSnapshots}/${report.summary.observationDaysRequired} snapshots, missing days=${report.summary.missingObservationDays}`,
    `- Earliest action: ${report.summary.earliestActionAt || 'n/a'}`,
    '',
    '## Decisions',
    '',
    '| Area | Decision | Automatic Action | Blockers |',
    '|---|---|---|---|',
    ...report.decisions.map(
      (item) =>
        `| ${item.area} | ${item.decision} | ${item.automaticActionAllowed ? 'allowed' : 'disabled'} | ${item.blockers.join(', ') || '-'} |`,
    ),
    '',
    '## P0 Candidates',
    '',
    '| Table | Owner | Runtime Refs | Blocker |',
    '|---|---|---:|---|',
    ...report.quarantineCandidates.map(
      (item) => `| ${item.table} | ${item.owner || '-'} | ${item.runtimeReferenceCount ?? 0} | ${item.blocker || '-'} |`,
    ),
    '',
    '## Runtime Holds',
    '',
    '| Table | Owner | Runtime Refs | Required Action |',
    '|---|---|---:|---|',
    ...report.runtimeHolds.map(
      (item) =>
        `| ${item.table} | ${item.owner || '-'} | ${item.runtimeReferenceCount ?? 0} | ${item.requiredAction || item.blocker || '-'} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `db-advisory-evidence-bundle: ${report.status.toUpperCase()} candidates=${report.summary.p0QuarantineCandidateCount} holds=${report.summary.runtimeHoldCount}`,
);
process.exit(0);
