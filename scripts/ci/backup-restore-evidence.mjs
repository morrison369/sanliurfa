#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'backup-restore-evidence.json');
const outMd = path.join(root, 'docs', 'BACKUP_RESTORE_EVIDENCE.md');

function readJson(rel) {
  try {
    return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const localGate = readJson('docs/local-gate-summary.json');
const releaseEvidence = readJson('docs/release-evidence.json');
const hasBackupSmoke =
  Array.isArray(localGate?.checks) &&
  localGate.checks.some((item) => String(item.id || item.name || '').includes('backup'));

const report = {
  generatedAt: new Date().toISOString(),
  status: releaseEvidence?.status === 'ready' ? 'ready' : 'advisory',
  smokeCommand: 'npm run smoke:db:backup-restore',
  gateCommand: 'npm run gate:done',
  localGateStatus: localGate?.status || 'missing',
  localGateMentionsBackup: hasBackupSmoke,
  releaseEvidence: releaseEvidence?.status || 'missing',
  note: 'Gerçek backup/restore smoke gate:done içinde çalışır; bu dosya deploy kanıtını görünür yapar.',
};

mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Backup Restore Evidence',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Smoke Command: \`${report.smokeCommand}\``,
    `- Gate Command: \`${report.gateCommand}\``,
    `- Local Gate Status: ${report.localGateStatus}`,
    `- Local Gate Mentions Backup: ${report.localGateMentionsBackup ? 'yes' : 'no'}`,
    `- Release Evidence: ${report.releaseEvidence}`,
    '',
    report.note,
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Backup restore evidence written: ${outJson}`);
console.log(`Backup restore evidence written: ${outMd}`);
