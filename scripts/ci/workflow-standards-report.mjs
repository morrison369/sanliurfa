#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const workflowsDir = join(root, '.github', 'workflows');
const docsDir = join(root, 'docs');
const jsonPath = join(docsDir, 'workflow-standards-report.json');
const mdPath = join(docsDir, 'workflow-standards-report.md');

const requiredMarkers = [
  { key: 'concurrency', pattern: /(^|\n)concurrency:\s*\n/m },
  { key: 'permissions', pattern: /(^|\n)permissions:\s*\n/m },
  { key: 'timeout-minutes', pattern: /timeout-minutes:\s*\d+/m },
  { key: 'workflow-standards-verify', pattern: /npm run workflow:standards:verify/m },
  { key: 'workflow-standards-report-artifact', pattern: /docs\/workflow-standards-report\.md/m },
  {
    key: 'workflow-standards-report-artifact-scoped-name',
    pattern: /name:\s*workflow-standards-report-\$\{\{\s*github\.job\s*\}\}/m,
  },
  { key: 'orphan-check', pattern: /npm run dev:isolated:check-no-orphan/m },
];

const files = readdirSync(workflowsDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));

const rows = files.map((name) => {
  const content = readFileSync(join(workflowsDir, name), 'utf8');
  const hasSetupNode = /uses:\s*actions\/setup-node@v4/m.test(content);
  const hasNode22Literal = /node-version:\s*'22'/m.test(content);
  const hasNode22EnvRef = /node-version:\s*\$\{\{\s*env\.NODE_VERSION\s*\}\}/m.test(content);
  const hasNode22EnvValue = /NODE_VERSION:\s*'22'/m.test(content);
  const checks = Object.fromEntries(
    requiredMarkers.map((marker) => [marker.key, marker.pattern.test(content)]),
  );
  const playwrightClean = !/run:\s*npx\s+playwright\s+test/m.test(content);
  const artifactV4Only =
    !/actions\/upload-artifact@v3/m.test(content) && !/actions\/download-artifact@v3/m.test(content);
  const cacheV4Only = !/actions\/cache@v3/m.test(content);
  const verifyOnly =
    !/npm run workflow:standards:gate/m.test(content) && !/npm run workflow:standards:report/m.test(content);
  const node22Pinned = !hasSetupNode || hasNode22Literal || (hasNode22EnvRef && hasNode22EnvValue);
  const passed =
    Object.values(checks).every(Boolean) &&
    playwrightClean &&
    artifactV4Only &&
    cacheV4Only &&
    verifyOnly &&
    node22Pinned;

  return {
    workflow: name,
    checks: {
      ...checks,
      playwright_clean: playwrightClean,
      artifact_v4_only: artifactV4Only,
      cache_v4_only: cacheV4Only,
      verify_only: verifyOnly,
      node22_pinned: node22Pinned,
    },
    passed,
  };
});

const totals = {
  total: rows.length,
  passed: rows.filter((row) => row.passed).length,
  failed: rows.filter((row) => !row.passed).length,
};

const report = {
  generatedAt: new Date().toISOString(),
  totals,
  rows,
};

mkdirSync(docsDir, { recursive: true });
writeFileSync(jsonPath, JSON.stringify(report, null, 2));

const tableLines = [
  '| Workflow | Concurrency | Permissions | Timeout | WF Verify | Report Artifact | Scoped Artifact Name | Orphan | Playwright Clean | Artifact v4 Only | Cache v4 Only | Verify Only | Node 22 Pinned | Status |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((row) => {
    const c = row.checks;
    return `| ${row.workflow} | ${c.concurrency ? 'OK' : 'FAIL'} | ${c.permissions ? 'OK' : 'FAIL'} | ${c['timeout-minutes'] ? 'OK' : 'FAIL'} | ${c['workflow-standards-verify'] ? 'OK' : 'FAIL'} | ${c['workflow-standards-report-artifact'] ? 'OK' : 'FAIL'} | ${c['workflow-standards-report-artifact-scoped-name'] ? 'OK' : 'FAIL'} | ${c['orphan-check'] ? 'OK' : 'FAIL'} | ${c.playwright_clean ? 'OK' : 'FAIL'} | ${c.artifact_v4_only ? 'OK' : 'FAIL'} | ${c.cache_v4_only ? 'OK' : 'FAIL'} | ${c.verify_only ? 'OK' : 'FAIL'} | ${c.node22_pinned ? 'OK' : 'FAIL'} | ${row.passed ? 'PASS' : 'FAIL'} |`;
  }),
];

const md = [
  '# Workflow Standards Report',
  '',
  `- Generated: ${report.generatedAt}`,
  `- Total: ${totals.total}`,
  `- Passed: ${totals.passed}`,
  `- Failed: ${totals.failed}`,
  '',
  ...tableLines,
  '',
].join('\n');

writeFileSync(mdPath, md);

console.log(`[workflow-standards-report] wrote ${jsonPath}`);
console.log(`[workflow-standards-report] wrote ${mdPath}`);
console.log(
  `[workflow-standards-report] summary: total=${totals.total} passed=${totals.passed} failed=${totals.failed}`,
);
