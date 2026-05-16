#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findGoogleMapsScraperBinary } from '../lib/google-maps-scraper-runner.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outFile = path.join(docsDir, 'gmaps-scraper-readiness-report.json');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const binary = findGoogleMapsScraperBinary({ projectRoot: root });
let cliOk = false;
let cliOutput = '';

if (binary) {
  const result = spawnSync(binary, ['-h'], {
    encoding: 'utf8',
    timeout: 15000,
    windowsHide: true,
  });
  cliOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
  cliOk = result.status === 0 && /-results/.test(cliOutput) && /-json/.test(cliOutput);
}

const requiredScripts = [
  'gmaps:query-plan',
  'gmaps:query-plan:all',
  'gmaps:discovery-plan',
  'gmaps:prod:install',
  'gmaps:prod:check',
  'gmaps:enrich:full',
  'gmaps:enrich:dry',
];

const scriptChecks = requiredScripts.map((name) => ({
  name,
  ok: typeof pkg.scripts?.[name] === 'string',
}));

const result = {
  generatedAt: new Date().toISOString(),
  status: 'ok',
  binary: {
    path: binary,
    found: Boolean(binary),
    cliOk,
    supports: {
      results: /-results/.test(cliOutput),
      json: /-json/.test(cliOutput),
      email: /-email/.test(cliOutput),
      extraReviews: /-extra-reviews/.test(cliOutput),
      concurrency: /-c int/.test(cliOutput),
      depth: /-depth int/.test(cliOutput),
    },
  },
  files: {
    runner: { rel: 'scripts/lib/google-maps-scraper-runner.mjs', ok: exists('scripts/lib/google-maps-scraper-runner.mjs') },
    prodInstaller: { rel: 'scripts/cwp-gmaps-install.sh', ok: exists('scripts/cwp-gmaps-install.sh') },
    enrichScript: { rel: 'scripts/enrich-places-from-gmaps.mjs', ok: exists('scripts/enrich-places-from-gmaps.mjs') },
    queryPlanScript: { rel: 'scripts/generate-gmaps-query-plan.mjs', ok: exists('scripts/generate-gmaps-query-plan.mjs') },
    discoveryPlanScript: { rel: 'scripts/generate-gmaps-discovery-plan.mjs', ok: exists('scripts/generate-gmaps-discovery-plan.mjs') },
    runbook: { rel: 'DEPLOY-OPS-RUNBOOK.md', ok: exists('DEPLOY-OPS-RUNBOOK.md') },
  },
  packageScripts: scriptChecks,
  policy: {
    sharedHostingMode: true,
    dockerRequired: false,
    localStorageOnly: true,
    recommendedConcurrency: 1,
    recommendedDepth: 1,
  },
};

const blockers = [
  !result.binary.found,
  !result.binary.cliOk,
  !Object.values(result.files).every((item) => item.ok),
  !result.packageScripts.every((item) => item.ok),
];

result.status = blockers.some(Boolean) ? 'blocked' : 'ok';

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

console.log(
  `gmaps-scraper-readiness: ${result.status.toUpperCase()} ` +
    `(binary=${result.binary.found ? result.binary.path : 'missing'}, cli=${result.binary.cliOk ? 'ok' : 'fail'})`,
);

if (result.status !== 'ok') process.exit(1);
