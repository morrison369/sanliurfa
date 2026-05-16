#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const inputJson = path.join(docsDir, 'db-retirement-observation-report.json');
const outJson = path.join(docsDir, 'db-p0-quarantine-plan.json');
const outMd = path.join(docsDir, 'db-p0-quarantine-plan.md');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

const observation = readJsonSafe(inputJson);
const p0 = Array.isArray(observation?.actionQueue?.p0) ? observation.actionQueue.p0 : [];
const runtimeHolds = Array.isArray(observation?.actionQueue?.p0RuntimeHold)
  ? observation.actionQueue.p0RuntimeHold
  : [];

const candidates = p0.map((item) => ({
  table: item.table,
  owner: item.evidence?.owner || 'unclassified',
  action: item.action || 'observe_then_quarantine_migration',
  blocker: item.blocker || 'production observation evidence missing',
  runtimeReferenceCount: item.sourceReferences?.runtimeReferenceCount ?? 0,
  migrationSources: item.evidence?.migrationSources || [],
  sourceFiles: item.evidence?.sourceFiles || [],
  replacementTables: item.evidence?.replacementTables || [],
  requiredEvidence: [
    '14 gun production pg_stat_user_tables gozlemi',
    'runtime source reference taramasi',
    'migration ownership ve rollback plani',
    'DB backup/restore kaniti',
    'manuel quarantine PR review',
  ],
}));

const holds = runtimeHolds.map((item) => ({
  table: item.table,
  owner: item.evidence?.owner || 'unclassified',
  blocker: item.blocker || 'runtime source references present',
  runtimeReferenceCount: item.sourceReferences?.runtimeReferenceCount ?? 0,
  runtimeReferences: item.sourceReferences?.runtimeReferences || [],
  requiredAction: 'Once runtime references are removed or migrated, re-run db:retirement:observe.',
}));

const report = {
  generatedAt: new Date().toISOString(),
  status: observation ? (candidates.length > 0 ? 'advisory' : 'ok') : 'missing_observation',
  source: 'docs/db-retirement-observation-report.json',
  policy: {
    automaticDropAllowed: false,
    automaticQuarantineAllowed: false,
    earliestActionAt: observation?.policy?.earliestActionAt || null,
  },
  summary: {
    quarantineCandidateCount: candidates.length,
    runtimeHoldCount: holds.length,
  },
  candidates,
  runtimeHolds: holds,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

fs.writeFileSync(
  outMd,
  [
    '# DB P0 Quarantine Plan',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Automatic drop allowed: ${report.policy.automaticDropAllowed ? 'yes' : 'no'}`,
    `- Automatic quarantine allowed: ${report.policy.automaticQuarantineAllowed ? 'yes' : 'no'}`,
    `- Earliest action at: ${report.policy.earliestActionAt || 'unknown'}`,
    '',
    '## Quarantine Candidates',
    '',
    '| Table | Owner | Runtime Refs | Blocker | Migration Sources |',
    '|---|---|---:|---|---|',
    ...candidates.map(
      (item) =>
        `| \`${item.table}\` | ${item.owner} | ${item.runtimeReferenceCount} | ${item.blocker} | ${item.migrationSources.join(', ') || 'unknown'} |`,
    ),
    '',
    '## Runtime Holds',
    '',
    '| Table | Owner | Runtime Refs | Blocker |',
    '|---|---|---:|---|',
    ...holds.map(
      (item) => `| \`${item.table}\` | ${item.owner} | ${item.runtimeReferenceCount} | ${item.blocker} |`,
    ),
    '',
    'Not: Bu plan migration üretmez, tablo silmez ve veri değiştirmez. Sadece manuel PR/DB review için kanıt kuyruğu üretir.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `db-p0-quarantine-plan: ${report.status.toUpperCase()} (${candidates.length} candidates, ${holds.length} runtime holds)`,
);
