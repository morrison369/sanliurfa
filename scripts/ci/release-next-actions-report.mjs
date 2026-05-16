#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'release-next-actions-report.json');
const outMd = path.join(docsDir, 'release-next-actions-report.md');

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const dashboard = readJsonSafe('docs/release-readiness-dashboard.json');
const dbPlan = readJsonSafe('docs/db-p0-quarantine-plan.json');
const dbCadence = readJsonSafe('docs/db-observation-cadence-report.json');
const dbManualDecision = readJsonSafe('docs/db-manual-decision-readiness-report.json');
const dbIndexReviewPlan = readJsonSafe('docs/db-index-review-plan.json');
const uploadParity = readJsonSafe('docs/local-upload-parity-report.json');
const uploadBucketQuota = readJsonSafe('docs/local-upload-bucket-quota-report.json');
const localMediaStorage = readJsonSafe('docs/local-media-storage-gate.json');
const adsenseLive = readJsonSafe('docs/adsense-live-readiness-report.json');
const scriptCanonical = readJsonSafe('docs/script-canonical-surface-report.json');
const cronReadiness = readJsonSafe('docs/cron-readiness-report.json');

const actions = [];
const now = Date.now();

function isFutureDue(action) {
  if (!action.dueAfter) return false;
  const due = Date.parse(action.dueAfter);
  return Number.isFinite(due) && due > now;
}

function isActionBlocking(action) {
  if (action.status !== 'review' && action.status !== 'waiting_for_evidence') return false;
  if (action.status === 'waiting_for_evidence' && isFutureDue(action)) return false;
  return Boolean(action.blocker);
}

if ((dbPlan?.summary?.quarantineCandidateCount ?? 0) > 0) {
  actions.push({
    priority: 'P1',
    area: 'database',
    title: 'DB P0 quarantine adaylarını production gözlem sürecinde tut',
    status: 'waiting_for_evidence',
    blocker: '14 günlük production gözlem ve rollback planı eksik',
    dueAfter: dbPlan?.policy?.earliestActionAt || null,
    destructive: false,
    command: 'npm run -s db:retirement:observe && npm run -s db:p0:quarantine:plan',
    detail: `${dbPlan.summary.quarantineCandidateCount} quarantine candidate, ${dbPlan.summary.runtimeHoldCount} runtime hold. Cadence=${dbCadence?.status || 'unknown'} (${dbCadence?.summary?.snapshotCount ?? 0}/${dbCadence?.policy?.observationDays ?? '?'}). Otomatik drop yok.`,
  });
}

if (dbManualDecision?.status === 'manual_review_ready') {
  actions.push({
    priority: 'P1',
    area: 'database',
    title: 'DB manuel quarantine PR kararını hazırla',
    status: 'review',
    blocker: 'Owner approval ve rollback SQL manuel yazılmalı',
    dueAfter: dbManualDecision?.policy?.earliestActionAt || null,
    destructive: false,
    command: 'npm run -s db:manual:decision:readiness',
    detail: `${dbManualDecision.summary.readyForManualPrCount} candidate manual PR için hazır; otomatik migration yok.`,
  });
}

if ((dbIndexReviewPlan?.summary?.reviewableIndexCount ?? 0) > 0) {
  actions.push({
    priority: 'P2',
    area: 'database-indexes',
    title: 'DB P2 index adaylarını EXPLAIN review planında tut',
    status: 'observed',
    blocker: null,
    dueAfter: dbIndexReviewPlan?.policy?.earliestActionAt || null,
    destructive: false,
    command: 'npm run -s db:index:review:plan',
    detail: `${dbIndexReviewPlan.summary.reviewableIndexCount} reviewable index candidate, ${dbIndexReviewPlan.summary.highRiskCount} high-risk keep/review. Otomatik index drop yok.`,
  });
}

if ((uploadParity?.summary?.unreferencedCandidateCount ?? 0) > 0) {
  actions.push({
    priority: 'P2',
    area: 'uploads',
    title: 'Local upload candidate sahipliğini bucket bazında sürdür',
    status: uploadBucketQuota?.status === 'ok' ? 'observed' : 'review',
    blocker: 'Otomatik silme yasak; DB/source sahipliği kanıtı gerekir',
    dueAfter: null,
    destructive: false,
    command: 'npm run -s images:uploads:parity && npm run -s images:uploads:bucket-quota',
    detail: `${uploadParity.summary.unreferencedCandidateCount} candidate, bucket quota=${uploadBucketQuota?.status || 'unknown'}, local filesystem only.`,
  });
}

if (localMediaStorage?.status) {
  const localStorageOk =
    localMediaStorage.status === 'ok' &&
    localMediaStorage.localStorageOnly === true &&
    localMediaStorage.externalObjectStorageConfigured === false &&
    (localMediaStorage.failures?.length ?? 0) === 0;
  actions.push({
    priority: localStorageOk ? 'P3' : 'P1',
    area: 'storage',
    title: localStorageOk ? 'Local media storage kanıtını periyodik tazele' : 'Local media storage kuralını düzelt',
    status: localStorageOk ? 'ok' : 'review',
    blocker: localStorageOk ? null : 'Local-only medya kuralı veya canlı local path kanıtı başarısız',
    dueAfter: null,
    destructive: false,
    command: 'npm run -s storage:local:gate',
    detail: `local-only=${localMediaStorage.localStorageOnly ? 'yes' : 'no'}, external-object-storage=${localMediaStorage.externalObjectStorageConfigured ? 'yes' : 'no'}, live=${(localMediaStorage.liveChecks || []).filter((item) => item.ok).length}/${localMediaStorage.liveChecks?.length ?? 0}, failed-patterns=${localMediaStorage.failures?.length ?? 0}.`,
  });
}

if (adsenseLive?.status !== 'passed') {
  actions.push({
    priority: 'P1',
    area: 'adsense',
    title: 'Canlı AdSense erişimini düzelt',
    status: 'review',
    blocker: 'Canlı ads.txt/meta/robots kanıtı başarısız veya eksik',
    dueAfter: null,
    destructive: false,
    command: 'npm run -s adsense:readiness:live',
    detail: `Live status=${adsenseLive?.status || 'missing'}.`,
  });
} else {
  actions.push({
    priority: 'P3',
    area: 'adsense',
    title: 'Canlı AdSense kanıtını periyodik tazele',
    status: 'ok',
    blocker: null,
    dueAfter: null,
    destructive: false,
    command: 'npm run -s adsense:readiness:live',
    detail: 'ads.txt, meta ve robots canlıda geçti.',
  });
}

if (scriptCanonical?.status) {
  actions.push({
    priority: 'P3',
    area: 'scripts',
    title: 'Script yüzeyini kanonik komutlarla yönet',
    status: (scriptCanonical?.summary?.missingCanonicalCount ?? 0) > 0 ? 'review' : 'ok',
    blocker: (scriptCanonical?.summary?.missingCanonicalCount ?? 0) > 0 ? 'Kanonik komut eksikleri var' : null,
    dueAfter: null,
    destructive: false,
    command: 'npm run -s scripts:canonical:report',
    detail: `${scriptCanonical.summary.totalScripts} package script var; ${scriptCanonical.summary.canonicalCount} kanonik komut, ${scriptCanonical.summary.missingCanonicalCount} eksik. Script silme yok; CI kanonik komutları kullanır.`,
  });
}


if (cronReadiness?.status !== 'ok') {
  actions.push({
    priority: 'P2',
    area: 'cron',
    title: 'CWP cron readiness farkını kapat',
    status: 'review',
    blocker: 'Managed cron preview eksik veya üretilemiyor',
    dueAfter: null,
    destructive: false,
    command: 'npm run -s cron:readiness:report && npm run -s ops:cwp:cron:apply-safe',
    detail: `${cronReadiness?.summary?.presentJobCount ?? 0}/${cronReadiness?.summary?.requiredJobCount ?? 0} managed job present. Kurulum manuel CWP shell ile yapılır.`,
  });
} else {
  actions.push({
    priority: 'P3',
    area: 'cron',
    title: 'Managed cron tanımını güncel tut',
    status: 'ok',
    blocker: null,
    dueAfter: null,
    destructive: false,
    command: 'npm run -s cron:readiness:report',
    detail: `${cronReadiness.summary.presentJobCount}/${cronReadiness.summary.requiredJobCount} managed cron job preview içinde mevcut.`,
  });
}

const blockingActions = actions.filter(isActionBlocking);
const waitingActions = actions.filter(
  (action) => action.status === 'waiting_for_evidence' && !isActionBlocking(action),
);
const report = {
  generatedAt: new Date().toISOString(),
  status: blockingActions.length > 0 ? 'advisory' : 'ok',
  releaseDecision: dashboard?.decision || 'unknown',
  policy: {
    destructiveActionsAllowed: false,
    localStorageOnly: true,
    automaticDbDropAllowed: false,
    automaticUploadDeleteAllowed: false,
  },
  summary: {
    actionCount: actions.length,
    blockingActionCount: blockingActions.length,
    waitingActionCount: waitingActions.length,
  },
  actions,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Release Next Actions',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Release decision: ${report.releaseDecision}`,
    `- Destructive actions allowed: ${report.policy.destructiveActionsAllowed ? 'yes' : 'no'}`,
    '',
    '| Priority | Area | Status | Title | Command | Detail |',
    '|---|---|---|---|---|---|',
    ...actions.map(
      (item) =>
        `| ${item.priority} | ${item.area} | ${item.status} | ${item.title} | \`${item.command}\` | ${item.detail} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `release-next-actions-report: ${report.status.toUpperCase()} (${report.summary.actionCount} actions, ${report.summary.blockingActionCount} blocking, ${report.summary.waitingActionCount} waiting)`,
);
