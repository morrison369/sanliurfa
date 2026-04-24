#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from 'fs';

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

const lintLog = readFirstExisting([parseArg('lint'), 'lint.log', 'eslint-stylish.log']);
const typeLog = readFirstExisting([parseArg('type'), 'type-check.log', 'typecheck-clean.log']);
const apiLog = readFirstExisting([parseArg('api'), 'api-release-gate.log']);
const openapiBaselinePath = parseArg('openapi') || 'docs/openapi-route-gap-baseline.json';

const lint = parseLint(lintLog);
const typecheck = parseTypecheck(typeLog);

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
    missingInSpec: openapiGap,
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
  `- OpenAPI missingInSpec baseline: ${metrics.openapi.missingInSpec}`,
  `- API release gate: ${metrics.apiReleaseGate.passed ? 'passed' : 'failed or not-run'}`,
  '',
];

console.log(summary.join('\n'));
