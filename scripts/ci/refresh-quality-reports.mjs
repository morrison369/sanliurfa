#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'quality-reports-refresh.json');
const outMd = path.join(docsDir, 'quality-reports-refresh.md');
const qualityCheckJson = path.join(docsDir, 'quality-check-report.json');
const qualityCheckMd = path.join(docsDir, 'quality-check-report.md');

function run(label, command, options = {}) {
  const startedAt = new Date();
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    env: process.env,
  });
  const endedAt = new Date();
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const status = result.status ?? 1;

  return {
    label,
    command,
    status,
    ok: status === 0,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    output: options.keepOutput ? output : undefined,
    outputTail: output.trim().split(/\r?\n/).slice(-40),
  };
}

function countRegex(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function parseLint(text) {
  const totals = text.match(/✖\s+(\d+)\s+problems\s+\((\d+)\s+errors,\s+(\d+)\s+warnings\)/);
  if (totals) {
    return {
      problems: Number(totals[1]),
      errors: Number(totals[2]),
      warnings: Number(totals[3]),
    };
  }

  const fallback = text.match(/✖\s+(\d+)\s+problems/);
  return {
    problems: Number(fallback?.[1] || 0),
    errors: statusFromFailure(text),
    warnings: 0,
  };
}

function statusFromFailure(text) {
  return /error|failed|exception/i.test(text) ? 1 : 0;
}

function parseTypecheck(text) {
  const errors = Number((text.match(/-\s+(\d+)\s+errors/) || [])[1] || 0);
  const warnings = Number((text.match(/-\s+(\d+)\s+warnings/) || [])[1] || 0);
  const hints = Number((text.match(/-\s+(\d+)\s+hints/) || [])[1] || 0);
  if (errors || warnings || hints) {
    return { errors, warnings, hints };
  }

  return {
    errors: countRegex(text, / - error ts\(| - error astro\(/g),
    warnings: countRegex(text, / - warning ts\(| - warning astro\(/g),
    hints: countRegex(text, / - hint ts\(| - hint astro\(/g),
  };
}

function parseOpenApiRouteSync(text) {
  return {
    documentedPaths: Number((text.match(/documented paths:\s*(\d+)/i) || [])[1] || 0),
    fileRoutes: Number((text.match(/file routes:\s*(\d+)/i) || [])[1] || 0),
    currentMissingInSpec: Number((text.match(/missing in spec \(current\):\s*(\d+)/i) || [])[1] || 0),
    baselineMissingInSpec: Number((text.match(/missing in spec \(baseline\):\s*(\d+)/i) || [])[1] || 0),
    newlyMissingVsBaseline: Number((text.match(/newly missing vs baseline:\s*(\d+)/i) || [])[1] || 0),
    resolvedVsBaseline: Number((text.match(/resolved vs baseline:\s*(\d+)/i) || [])[1] || 0),
  };
}

function writeQualityCheck(lintStep, typeStep) {
  const lint = parseLint(lintStep.output || '');
  const typecheck = parseTypecheck(typeStep.output || '');

  if (!lintStep.ok && lint.problems === 0) {
    lint.problems = 1;
    lint.errors = Math.max(lint.errors, 1);
  }

  if (!typeStep.ok && typecheck.errors === 0) {
    typecheck.errors = 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status:
      lintStep.ok &&
      typeStep.ok &&
      lint.errors === 0 &&
      lint.warnings === 0 &&
      typecheck.errors === 0 &&
      typecheck.warnings === 0 &&
      typecheck.hints === 0
        ? 'passed'
        : 'failed',
    lint: {
      command: lintStep.command,
      exitCode: lintStep.status,
      ...lint,
    },
    typecheck: {
      command: typeStep.command,
      exitCode: typeStep.status,
      ...typecheck,
    },
  };

  writeFileSync(qualityCheckJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(
    qualityCheckMd,
    [
      '# Quality Check Report',
      '',
      `- Generated at: ${report.generatedAt}`,
      `- Status: ${report.status}`,
      `- Lint: ${report.lint.errors} errors, ${report.lint.warnings} warnings, ${report.lint.problems} problems`,
      `- Typecheck: ${report.typecheck.errors} errors, ${report.typecheck.warnings} warnings, ${report.typecheck.hints} hints`,
      '',
    ].join('\n'),
    'utf8',
  );

  return report;
}

mkdirSync(docsDir, { recursive: true });

const lintStep = run('lint', 'npm run -s lint', { keepOutput: true });
const typeStep = run('typecheck', 'npm run -s type-check', { keepOutput: true });
const qualityCheck = writeQualityCheck(lintStep, typeStep);

const reportSteps = [
  run('openapi route sync', 'npx tsx scripts/openapi/sync-routes.ts --quiet-list', { keepOutput: true }),
  run('script surface', 'node scripts/ci/script-surface-report.mjs'),
  run('script canonical surface', 'node scripts/ci/script-canonical-surface-report.mjs'),
  run('build artifact', 'node scripts/ci/build-artifact-report.mjs'),
  run('migration duplicate drift', 'node scripts/ci/migration-duplicate-drift-report.mjs'),
  run('db usage audit', 'node scripts/ci/db-usage-audit.mjs'),
  run('db retirement observation', 'node scripts/ci/db-retirement-observation-report.mjs'),
  run('db p0 quarantine plan', 'node scripts/ci/db-p0-quarantine-plan.mjs'),
  run('db observation cadence', 'node scripts/ci/db-observation-cadence-report.mjs'),
  run('db manual decision readiness', 'node scripts/ci/db-manual-decision-readiness-report.mjs'),
  run('db registry classification', 'node scripts/ci/db-registry-classification-report.mjs'),
  run('db prod version compare', 'node scripts/ci/db-prod-version-compare-report.mjs'),
  run('db index review plan', 'node scripts/ci/db-index-review-plan.mjs'),
  run('db advisory evidence bundle', 'node scripts/ci/db-advisory-evidence-bundle.mjs'),
  run('search zero result', 'node scripts/ci/search-zero-result-report.mjs'),
  run('local upload parity', 'node scripts/ci/local-upload-parity-report.mjs'),
  run('local upload bucket quota', 'node scripts/ci/local-upload-bucket-quota-report.mjs'),
  run('local upload classification', 'node scripts/ci/local-upload-candidate-classification.mjs'),
  run('local upload archive candidates', 'node scripts/ci/local-upload-archive-candidates.mjs'),
  run('local media storage gate', 'node scripts/ci/local-media-storage-gate.mjs'),
  run('redis runtime health', 'node scripts/ci/redis-runtime-health-report.mjs'),
  run('warmup safety', 'node scripts/ci/warmup-safety-report.mjs'),
  run('cron readiness', 'node scripts/ci/cron-readiness-report.mjs'),
  run('internal linking', 'node scripts/ci/internal-linking-report.mjs'),
  run('llms sitemap auto update', 'node scripts/ci/llms-sitemap-auto-update-gate.mjs'),
  run('gmaps scraper readiness', 'node scripts/ci/gmaps-scraper-readiness-report.mjs'),
  run('gmaps query plan', 'node scripts/generate-gmaps-query-plan.mjs --only-missing'),
  run('gmaps discovery plan', 'node scripts/generate-gmaps-discovery-plan.mjs'),
  run('gmaps discovery drafts', 'node scripts/import-gmaps-discovery-drafts.mjs'),
  run('ollama readiness', 'node scripts/ci/ollama-readiness-report.mjs'),
  run('blog keyword research', 'node scripts/ci/blog-keyword-research-report.mjs'),
  run('blog draft quality', 'node scripts/ci/blog-draft-quality-report.mjs'),
  run('blog draft rich results', 'node scripts/ci/blog-draft-rich-results-report.mjs'),
  run('blog publish readiness', 'node scripts/ci/blog-publish-readiness-report.mjs'),
  run('blog admin publish queue', 'node scripts/ci/blog-admin-publish-queue-report.mjs'),
  run('lighthouse ci', 'node scripts/ci/pagespeed-api-less-lighthouse-report.mjs --max-urls=1 --strategy=mobile'),
  run('content agent drafts', 'node scripts/ci/content-agent-drafts-report.mjs'),
  run('backend frontend improvements', 'node scripts/ci/backend-frontend-improvement-report.mjs'),
  run('social ux report', 'node scripts/ci/social-ux-report.mjs'),
  run('unit skip report', 'node scripts/ci/unit-skip-report.mjs'),
  run('e2e skip report', 'node scripts/ci/e2e-skip-report.mjs'),
  run('e2e critical coverage', 'node scripts/ci/e2e-critical-coverage-report.mjs'),
  run('api release gate report', 'node scripts/ci/api-release-gate-report.mjs'),
  run('api debug envelope', 'node scripts/ci/api-debug-envelope-gate.mjs'),
  run('adsense readiness', 'node scripts/ci/adsense-readiness-gate.mjs'),
  run('release next actions', 'node scripts/ci/release-next-actions-report.mjs'),
];

const steps = [lintStep, typeStep, ...reportSteps].map(({ output, ...step }) => step);
const openapiStep = reportSteps[0];
const failed = steps.filter((step) => !step.ok);
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'passed' : 'failed',
  qualityCheck: {
    status: qualityCheck.status,
    lint: qualityCheck.lint,
    typecheck: qualityCheck.typecheck,
  },
  openapiRouteSync: parseOpenApiRouteSync(openapiStep.output || ''),
  steps,
};

writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(
  outMd,
  [
    '# Quality Reports Refresh',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Failed steps: ${failed.length}`,
    '',
    '| Step | Status | Duration Ms |',
    '|---|---|---:|',
    ...steps.map((step) => `| ${step.label} | ${step.ok ? 'ok' : 'failed'} | ${step.durationMs} |`),
    '',
  ].join('\n'),
  'utf8',
);

if (existsSync(outJson)) {
  console.log(`quality-reports-refresh: ${report.status.toUpperCase()} (${failed.length} failed)`);
}

process.exit(failed.length === 0 ? 0 : 1);
