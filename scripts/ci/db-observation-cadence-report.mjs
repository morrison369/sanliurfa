#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const snapshotsDir = path.join(docsDir, 'db-retirement-observations');
const observationReport = path.join(docsDir, 'db-retirement-observation-report.json');
const outJson = path.join(docsDir, 'db-observation-cadence-report.json');
const outMd = path.join(docsDir, 'db-observation-cadence-report.md');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listSnapshots() {
  if (!fs.existsSync(snapshotsDir)) return [];
  return fs.readdirSync(snapshotsDir)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .map((file) => ({
      file: `docs/db-retirement-observations/${file}`,
      date: file.slice(0, 10),
      json: readJsonSafe(path.join(snapshotsDir, file)),
    }))
    .filter((item) => item.json);
}

const now = new Date();
const observation = readJsonSafe(observationReport);
const snapshots = listSnapshots();
const latest = snapshots.at(-1) || null;
const observationDays = observation?.policy?.observationDays ?? 14;
const earliestActionAt = observation?.policy?.earliestActionAt || null;
const latestAt = latest?.json?.generatedAt || null;
const latestAgeHours = latestAt ? Number(((now.getTime() - Date.parse(latestAt)) / 36e5).toFixed(1)) : null;
const missingDays = Math.max(0, observationDays - snapshots.length);
const stableEnoughForAction = Boolean(observation?.snapshots?.stableEnoughForAction);
const cadenceOk = latestAgeHours !== null && latestAgeHours <= 36;

const report = {
  generatedAt: now.toISOString(),
  status: cadenceOk ? (stableEnoughForAction ? 'action_window_ready' : 'observing') : 'stale',
  policy: {
    observationDays,
    cadenceHours: 24,
    staleAfterHours: 36,
    automaticDropAllowed: false,
    cronCommand: 'npm run -s db:retirement:observe && npm run -s db:p0:quarantine:plan && npm run -s db:observation:cadence',
  },
  summary: {
    snapshotCount: snapshots.length,
    missingDays,
    stableEnoughForAction,
    latestSnapshot: latest?.file || null,
    latestAt,
    latestAgeHours,
    earliestActionAt,
    p0QuarantineCandidateCount: observation?.summary?.p0QuarantineCandidateCount ?? 0,
    p0RuntimeHoldCount: observation?.summary?.p0RuntimeHoldCount ?? 0,
  },
  snapshots: snapshots.map((item) => ({
    file: item.file,
    generatedAt: item.json.generatedAt,
    p0QuarantineCandidateCount: item.json?.summary?.p0QuarantineCandidateCount ?? 0,
    p0RuntimeHoldCount: item.json?.summary?.p0RuntimeHoldCount ?? 0,
  })),
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# DB Observation Cadence Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Snapshot count: ${report.summary.snapshotCount}/${report.policy.observationDays}`,
    `- Missing observation days: ${report.summary.missingDays}`,
    `- Latest age hours: ${report.summary.latestAgeHours ?? 'unknown'}`,
    `- Earliest action at: ${report.summary.earliestActionAt || 'unknown'}`,
    `- Cron command: \`${report.policy.cronCommand}\``,
    '',
    '| Snapshot | Generated At | P0 Quarantine | Runtime Hold |',
    '|---|---|---:|---:|',
    ...report.snapshots.map(
      (item) =>
        `| \`${item.file}\` | ${item.generatedAt} | ${item.p0QuarantineCandidateCount} | ${item.p0RuntimeHoldCount} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `db-observation-cadence-report: ${report.status.toUpperCase()} (${report.summary.snapshotCount}/${report.policy.observationDays} snapshots)`,
);
process.exit(report.status === 'stale' ? 1 : 0);
