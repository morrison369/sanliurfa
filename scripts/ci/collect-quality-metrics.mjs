#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';

function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function read(path) {
  if (!path || !existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

function countRegex(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

function readFirstExisting(paths) {
  for (const p of paths) {
    if (p && existsSync(p)) return readFileSync(p, 'utf8');
  }
  return '';
}

function runCommand(command) {
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    env: process.env,
  });

  return {
    status: result.status ?? 1,
    output: `${result.stdout || ''}${result.stderr || ''}`,
  };
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
    errors: 0,
    warnings: 0,
  };
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

function parseOpenApiRouteSync(text, fallbackBaseline) {
  const documentedPaths = Number((text.match(/documented paths:\s*(\d+)/i) || [])[1] || 0);
  const fileRoutes = Number((text.match(/file routes:\s*(\d+)/i) || [])[1] || 0);
  const current = Number(
    (text.match(/missing in spec \(current\):\s*(\d+)/i) || [])[1] || 0
  );
  const baseline = Number(
    (text.match(/missing in spec \(baseline\):\s*(\d+)/i) || [])[1] || fallbackBaseline
  );
  const newlyMissing = Number(
    (text.match(/newly missing vs baseline:\s*(\d+)/i) || [])[1] || 0
  );
  const resolvedFromBaseline = Number(
    (text.match(/resolved vs baseline:\s*(\d+)/i) || [])[1] || 0
  );

  return {
    documentedPaths,
    fileRoutes,
    currentMissingInSpec: current,
    baselineMissingInSpec: baseline,
    newlyMissingVsBaseline: newlyMissing,
    resolvedVsBaseline: resolvedFromBaseline,
  };
}

const lintArg = parseArg('lint');
const typeArg = parseArg('type');
const lintResult = lintArg
  ? { status: 0, output: readFirstExisting([lintArg]) }
  : runCommand('npm run -s lint');
const typeResult = typeArg
  ? { status: 0, output: readFirstExisting([typeArg]) }
  : runCommand('npm run -s type-check');
const lintLog = lintResult.output;
const typeLog = typeResult.output;
const apiLog = readFirstExisting([parseArg('api'), 'api-release-gate.log']);
const openapiBaselinePath = parseArg('openapi') || 'docs/openapi-route-gap-baseline.json';

const lint = parseLint(lintLog);
const typecheck = parseTypecheck(typeLog);

if (!lintArg && lintResult.status !== 0 && lint.problems === 0) {
  lint.problems = 1;
  lint.errors = 1;
}

if (!typeArg && typeResult.status !== 0 && typecheck.errors === 0) {
  typecheck.errors = 1;
}

const apiGatePassed =
  /OK: critical OpenAPI checks passed/.test(apiLog) ||
  /status:\s*success/i.test(apiLog);

let openapiGap = 0;
if (openapiBaselinePath && existsSync(openapiBaselinePath)) {
  try {
    const raw = JSON.parse(readFileSync(openapiBaselinePath, 'utf8'));
    openapiGap = Array.isArray(raw?.missingInSpec) ? raw.missingInSpec.length : 0;
  } catch {
    openapiGap = 0;
  }
}

const openapiRouteResult = runCommand('npx tsx scripts/openapi/sync-routes.ts --quiet-list');
const openapiRouteSync = parseOpenApiRouteSync(openapiRouteResult.output, openapiGap);

const metrics = {
  generatedAt: new Date().toISOString(),
  lint: {
    errors: lint.errors,
    warnings: lint.warnings,
    problems: lint.problems,
  },
  typecheck: {
    errors: typecheck.errors,
    warnings: typecheck.warnings,
    hints: typecheck.hints,
  },
  apiReleaseGate: {
    passed: apiGatePassed,
  },
  openapi: {
    documentedPaths: openapiRouteSync.documentedPaths,
    fileRoutes: openapiRouteSync.fileRoutes,
    missingInSpec: openapiRouteSync.currentMissingInSpec,
    currentMissingInSpec: openapiRouteSync.currentMissingInSpec,
    baselineMissingInSpec: openapiRouteSync.baselineMissingInSpec,
    newlyMissingVsBaseline: openapiRouteSync.newlyMissingVsBaseline,
    resolvedVsBaseline: openapiRouteSync.resolvedVsBaseline,
  },
};

writeFileSync('quality-metrics.json', JSON.stringify(metrics, null, 2));

const summary = [
  '## Quality Metrics',
  '',
  `- Lint errors: ${metrics.lint.errors}`,
  `- Lint warnings: ${metrics.lint.warnings}`,
  `- Lint total problems: ${metrics.lint.problems}`,
  `- Type errors: ${metrics.typecheck.errors}`,
  `- Type warnings: ${metrics.typecheck.warnings}`,
  `- Type hints: ${metrics.typecheck.hints}`,
  `- OpenAPI documented paths: ${metrics.openapi.documentedPaths}`,
  `- OpenAPI file routes: ${metrics.openapi.fileRoutes}`,
  `- OpenAPI missingInSpec current: ${metrics.openapi.currentMissingInSpec}`,
  `- OpenAPI missingInSpec baseline: ${metrics.openapi.baselineMissingInSpec}`,
  `- OpenAPI newly missing vs baseline: ${metrics.openapi.newlyMissingVsBaseline}`,
  `- OpenAPI resolved vs baseline: ${metrics.openapi.resolvedVsBaseline}`,
  `- API release gate: ${metrics.apiReleaseGate.passed ? 'passed' : 'failed or not-run'}`,
  '',
];

console.log(summary.join('\n'));
