#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  'npm run -s jobs:pharmacy:refresh',
  'npm run -s jobs:transit:refresh',
  'npm run -s jobs:weather:refresh',
  'npm run -s jobs:social:retention',
  'npm run -s jobs:places:sla-alert',
  'npm run -s jobs:reports:social-lifecycle',
  'npm run -s jobs:content:quality',
  'npm run -s smoke:transport:freshness',
  'npm run -s quality:reports:refresh',
  'npm run -s db:observation:cadence',
  'npm run -s db:manual:decision:readiness',
  'npm run -s gmaps:readiness',
  'npm run -s gmaps:query-plan',
  'npm run -s gmaps:discovery-plan',
  'npm run -s gmaps:discovery-drafts',
  'npm run -s ollama:readiness',
  'npm run -s content:agents:drafts:report',
  'npm run -s quality:metrics',
  'npm run -s release:readiness:dashboard',
];

if (process.env.NIGHTLY_INCLUDE_RELEASE_PUBLIC === '1') {
  steps.push('node scripts/ci/release-public-gate.mjs');
}

if (process.env.NIGHTLY_INCLUDE_CRITICAL_E2E === '1') {
  steps.push('node scripts/e2e/nightly-critical-suite.mjs');
}

if (process.env.NIGHTLY_INCLUDE_PRODUCT_E2E === '1') {
  steps.push('node scripts/e2e/nightly-product-suite.mjs');
}

if (process.env.NIGHTLY_INCLUDE_E2E === '1') {
  steps.push('npm run -s test:e2e:clean');
}

if (process.env.NIGHTLY_INCLUDE_E2E_REPORT === '1') {
  steps.push('npm run -s test:e2e:report');
}

if (process.env.NIGHTLY_INCLUDE_ADSENSE_LIVE === '1') {
  steps.push('npm run -s adsense:readiness:live');
}

function run(cmd) {
  console.log(`[nightly-core] ${cmd}`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`step failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

try {
  for (const step of steps) run(step);
  console.log('[nightly-core] all steps completed');
} catch (error) {
  console.error(`[nightly-core] ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
}
