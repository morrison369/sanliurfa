#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'cron-readiness-report.json');
const outMd = path.join(docsDir, 'cron-readiness-report.md');

const requiredManagedJobs = [
  'doctor-hourly',
  'weather-refresh-halfhour',
  'transit-refresh-hourly',
  'pharmacy-refresh-daily',
  'smoke-6hour',
  'report-daily',
  'rotate-events-daily',
  'cleanup-weekly',
  'incident-cleanup-weekly',
  'daily-ops',
  'weekly-audit',
  'release-readiness',
  'db-backup-daily',
  'indexnow-daily',
  'uptime-check-5min',
  'nightly-evidence',
];

function previewCron() {
  const result = spawnSync('bash', ['scripts/cwp-cron-install.sh', 'preview'], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    output: `${result.stdout || ''}${result.stderr || ''}`,
  };
}

const preview = previewCron();
const jobs = requiredManagedJobs.map((job) => ({
  job,
  present: preview.output.includes(`# SANLIURFA_CWP_OPS ${job}`),
}));
const missing = jobs.filter((item) => !item.present);
const report = {
  generatedAt: new Date().toISOString(),
  status: preview.ok && missing.length === 0 ? 'ok' : 'blocked',
  policy: {
    installsCron: false,
    previewCommand: 'npm run -s ops:cwp:cron:preview',
    applyCommand: 'npm run -s ops:cwp:cron:apply-safe',
  },
  summary: {
    requiredJobCount: requiredManagedJobs.length,
    presentJobCount: jobs.length - missing.length,
    missingJobCount: missing.length,
  },
  jobs,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Cron Readiness Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Installs cron: ${report.policy.installsCron ? 'yes' : 'no'}`,
    `- Present jobs: ${report.summary.presentJobCount}/${report.summary.requiredJobCount}`,
    `- Apply command: \`${report.policy.applyCommand}\``,
    '',
    '| Job | Present In Managed Preview |',
    '|---|---|',
    ...jobs.map((item) => `| ${item.job} | ${item.present ? 'yes' : 'no'} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `cron-readiness-report: ${report.status.toUpperCase()} (${report.summary.presentJobCount}/${report.summary.requiredJobCount} jobs)`,
);
process.exit(report.status === 'ok' ? 0 : 1);
