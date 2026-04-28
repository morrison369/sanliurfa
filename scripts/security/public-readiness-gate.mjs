#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const repo = 'morrison369/sanliurfa';
const blockers = [];

const run = (cmd, args) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const runAllowFail = (cmd, args) => {
  try {
    return { ok: true, stdout: run(cmd, args), stderr: '' };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || '').trim(),
    };
  }
};

const trackedFiles = run('git', ['ls-files'])
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

for (const forbidden of ['.env', '.env.production', '.env.staging', 'deploy_key']) {
  if (trackedFiles.includes(forbidden)) {
    blockers.push(`tracked forbidden file: ${forbidden}`);
  }
}

const currentSecretScan = runAllowFail(process.execPath, ['scripts/security/scan-secrets.mjs']);
if (!currentSecretScan.ok) {
  blockers.push(`current tree secret scan failed:\n${currentSecretScan.stderr || currentSecretScan.stdout}`);
}

const historyDeployKey = runAllowFail('git', ['log', '--all', '--name-only', '--', 'deploy_key']);
if ((historyDeployKey.stdout || '').includes('deploy_key')) {
  blockers.push('git history contains deploy_key; rotate keys and clean history before public visibility');
}

const oldCredentialLiterals = [
  ['kWtUY', 'byYgbS7'],
  ['vyD7', 'l4kGFtnw'],
  ['Urfa_2024', '_Secure'],
  ['zIT7Y9', 'yrJZRV'],
  ['BcqH7t', '5zNKfw'],
].map((parts) => parts.join(''));

const historySecretPattern = [
  ...oldCredentialLiterals,
  'sk_live_[A-Za-z0-9]{10,}',
  'whsec_[A-Za-z0-9]{10,}',
].join('|');

const historySecretProbe = runAllowFail('git', [
  'log',
  '--all',
  '--oneline',
  '-G',
  historySecretPattern,
]);
if ((historySecretProbe.stdout || '').trim()) {
  blockers.push('git history contains old credential literals; rotate credentials and clean history before public visibility');
}

const visibility = runAllowFail('gh', ['repo', 'view', repo, '--json', 'visibility', '-q', '.visibility']);
if (!visibility.ok) {
  blockers.push(`GitHub visibility check failed: ${visibility.stderr || visibility.stdout}`);
} else if (visibility.stdout !== 'PRIVATE') {
  console.log(`[public-readiness] repo visibility is already ${visibility.stdout}`);
}

if (blockers.length > 0) {
  console.error('[public-readiness] BLOCKED: repository is not safe to make public');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  console.error('\nRun only after blockers are closed:');
  console.error(`gh repo edit ${repo} --visibility public --accept-visibility-change-consequences`);
  process.exit(1);
}

console.log('[public-readiness] ok: current tree and tracked files are ready for public visibility');
