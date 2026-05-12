#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

function read(rel) {
  const full = resolve(root, rel);
  if (!existsSync(full)) {
    errors.push(`${rel}: missing`);
    return '';
  }
  return readFileSync(full, 'utf8');
}

function requireToken(rel, token, label = token) {
  const content = read(rel);
  if (content && !content.includes(token)) {
    errors.push(`${rel}: missing ${label}`);
  }
}

function requirePattern(rel, pattern, label) {
  const content = read(rel);
  if (content && !pattern.test(content)) {
    errors.push(`${rel}: missing ${label}`);
  }
}

requireToken('scripts/prod-cwp-ops.sh', 'bash scripts/prod-cwp-ops.sh predeploy-checks', 'predeploy-checks usage');
requirePattern(
  'scripts/prod-cwp-ops.sh',
  /preflight\)\s+preflight\s+;;/m,
  'light preflight command routing',
);
requirePattern(
  'scripts/prod-cwp-ops.sh',
  /predeploy-checks\)\s+predeploy_checks_flow\s+;;/m,
  'explicit predeploy-checks command routing',
);
requirePattern(
  'scripts/prod-cwp-ops.sh',
  /safe_deploy_flow\(\)[\s\S]*predeploy_checks_flow[\s\S]*deploy_flow 1/m,
  'safe-deploy single-pass precheck flow',
);
requireToken('scripts/prod-cwp-ops.sh', '--max-time "$HTTP_MAX_TIME"', 'bounded health curl timeout');
requireToken('scripts/cwp-smoke.sh', '--max-time "$HTTP_MAX_TIME"', 'bounded smoke curl timeout');
requireToken('scripts/cwp-ops-report.sh', '"access_log_probe"', 'ops report access log probe section');
requireToken('scripts/cwp-release-readiness.sh', '"access_log_probe"', 'release readiness access log probe section');
requireToken(
  'scripts/ops/access-log-probe.mjs',
  'Domain kullanıcısı shell erişiminde access log görünmüyor',
  'access log blocker copy',
);

if (errors.length > 0) {
  console.error('[ops-contract-gate] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[ops-contract-gate] PASS');
