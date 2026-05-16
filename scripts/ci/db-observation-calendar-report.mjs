#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'db-observation-calendar-report.json');
const outMd = path.join(docsDir, 'db-observation-calendar-report.md');

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

const cadence = readJsonSafe('docs/db-observation-cadence-report.json');
const evidence = readJsonSafe('docs/db-advisory-evidence-bundle.json');
const snapshots = Array.isArray(cadence?.snapshots) ? cadence.snapshots : [];
const observationDays = cadence?.policy?.observationDays ?? evidence?.summary?.observationDaysRequired ?? 14;
const latestAt = cadence?.summary?.latestAt ? new Date(cadence.summary.latestAt) : null;
const firstSnapshotAt = snapshots[0]?.generatedAt ? new Date(snapshots[0].generatedAt) : latestAt;
const startAt = firstSnapshotAt || new Date();
const completedByDate = new Map(
  snapshots
    .filter((item) => item?.generatedAt)
    .map((item) => [isoDate(new Date(item.generatedAt)), item]),
);
const calendar = Array.from({ length: observationDays }, (_, index) => {
  const date = addDays(startAt, index);
  const key = isoDate(date);
  const snapshot = completedByDate.get(key) || null;
  return {
    day: index + 1,
    date: key,
    status: snapshot ? 'complete' : index < snapshots.length ? 'missing' : 'pending',
    snapshotFile: snapshot?.file ?? null,
    generatedAt: snapshot?.generatedAt ?? null,
    p0QuarantineCandidateCount: snapshot?.p0QuarantineCandidateCount ?? null,
    p0RuntimeHoldCount: snapshot?.p0RuntimeHoldCount ?? null,
  };
});
const completeCount = calendar.filter((item) => item.status === 'complete').length;
const nextPending = calendar.find((item) => item.status !== 'complete') || null;
const nextSnapshotDueAt = latestAt ? addDays(latestAt, 1).toISOString() : null;
const earliestActionAt = cadence?.summary?.earliestActionAt ?? evidence?.summary?.earliestActionAt ?? null;

const report = {
  generatedAt: new Date().toISOString(),
  status: completeCount >= observationDays ? 'complete' : 'observing',
  policy: {
    observationDays,
    cadenceHours: cadence?.policy?.cadenceHours ?? 24,
    automaticDropAllowed: false,
    automaticIndexDropAllowed: false,
    destructiveActionsAllowed: false,
  },
  summary: {
    completeCount,
    missingOrPendingCount: observationDays - completeCount,
    nextSnapshotDueAt,
    nextPendingDay: nextPending?.day ?? null,
    nextPendingDate: nextPending?.date ?? null,
    earliestActionAt,
    actionWindowOpen: evidence?.summary?.actionWindowOpen === true,
    p0QuarantineCandidateCount: evidence?.summary?.p0QuarantineCandidateCount ?? 0,
    runtimeHoldCount: evidence?.summary?.runtimeHoldCount ?? 0,
  },
  calendar,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# DB Observation Calendar',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Complete: ${report.summary.completeCount}/${report.policy.observationDays}`,
    `- Next snapshot due: ${report.summary.nextSnapshotDueAt || 'unknown'}`,
    `- Earliest action: ${report.summary.earliestActionAt || 'unknown'}`,
    `- Automatic drop allowed: ${report.policy.automaticDropAllowed ? 'yes' : 'no'}`,
    '',
    '| Day | Date | Status | Snapshot | P0 Candidates | Runtime Holds |',
    '|---:|---|---|---|---:|---:|',
    ...calendar.map(
      (item) =>
        `| ${item.day} | ${item.date} | ${item.status} | ${item.snapshotFile ?? ''} | ${item.p0QuarantineCandidateCount ?? ''} | ${item.p0RuntimeHoldCount ?? ''} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`db-observation-calendar-report: ${report.status.toUpperCase()} (${completeCount}/${observationDays})`);
process.exit(0);
