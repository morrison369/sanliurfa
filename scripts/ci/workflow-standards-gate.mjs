#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const workflowsDir = join(root, '.github', 'workflows');

const requiredMarkers = [
  { key: 'concurrency', pattern: /(^|\n)concurrency:\s*\n/m },
  { key: 'permissions', pattern: /(^|\n)permissions:\s*\n/m },
  { key: 'timeout-minutes', pattern: /timeout-minutes:\s*\d+/m },
  {
    key: 'workflow-standards-verify',
    pattern: /npm run workflow:standards:verify/m,
  },
  {
    key: 'workflow-standards-report-artifact',
    pattern: /docs\/workflow-standards-report\.md/m,
  },
  {
    key: 'workflow-standards-report-artifact-scoped-name',
    pattern: /name:\s*workflow-standards-report-\$\{\{\s*github\.job\s*\}\}/m,
  },
  {
    key: 'orphan-check',
    pattern: /npm run dev:isolated:check-no-orphan/m,
  },
];

const errors = [];

const files = readdirSync(workflowsDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));

for (const name of files) {
  const full = join(workflowsDir, name);
  const content = readFileSync(full, 'utf8');
  const hasSetupNode = /uses:\s*actions\/setup-node@v4/m.test(content);
  const hasNode22Literal = /node-version:\s*'22'/m.test(content);
  const hasNode22EnvRef = /node-version:\s*\$\{\{\s*env\.NODE_VERSION\s*\}\}/m.test(content);
  const hasNode22EnvValue = /NODE_VERSION:\s*'22'/m.test(content);

  for (const marker of requiredMarkers) {
    if (!marker.pattern.test(content)) {
      errors.push(`${name}: missing ${marker.key}`);
    }
  }

  if (/run:\s*npx\s+playwright\s+test/m.test(content)) {
    errors.push(`${name}: uses "npx playwright test"; use npm run test:e2e:clean`);
  }

  if (/actions\/upload-artifact@v3/m.test(content) || /actions\/download-artifact@v3/m.test(content)) {
    errors.push(`${name}: uses artifact action @v3; use @v4`);
  }

  if (/actions\/cache@v3/m.test(content)) {
    errors.push(`${name}: uses cache action @v3; use @v4`);
  }

  if (/npm run workflow:standards:gate/m.test(content) || /npm run workflow:standards:report/m.test(content)) {
    errors.push(`${name}: uses standalone workflow standards steps; use workflow:standards:verify`);
  }

  if (hasSetupNode && !(hasNode22Literal || (hasNode22EnvRef && hasNode22EnvValue))) {
    errors.push(`${name}: setup-node is not pinned to Node 22`);
  }
}

if (errors.length > 0) {
  console.error('[workflow-standards-gate] FAILED');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('[workflow-standards-gate] ok');
