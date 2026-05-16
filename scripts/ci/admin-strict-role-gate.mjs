#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'admin-strict-role-gate.json');
const outMd = path.join(docsDir, 'admin-strict-role-gate.md');

const HIGH_IMPACT_PATTERNS = [
  /bulk/i,
  /flags?/i,
  /quotas?/i,
  /exports?/i,
  /security/i,
  /settings/i,
  /integrations/i,
  /site\/(settings|media|integrations|seo-overrides|homepage-sections|platform|services)/i,
  /reports\/(generate|schedule)/i,
];

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && /\.(ts|astro)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function toRel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

function isHighImpact(rel) {
  return rel.startsWith('src/pages/api/admin/') && HIGH_IMPACT_PATTERNS.some((pattern) => pattern.test(rel));
}

function hasStrictAdminCheck(source) {
  return /role\s*!==\s*['"]admin['"]|role\s*===\s*['"]admin['"]|locals\.user\?\.role\s*!==\s*['"]admin['"]|locals\.user\?\.role\s*===\s*['"]admin['"]/.test(source);
}

const apiRoot = path.join(root, 'src', 'pages', 'api', 'admin');
const candidates = fs.existsSync(apiRoot) ? walk(apiRoot).filter((file) => isHighImpact(toRel(file))) : [];
const results = candidates.map((file) => {
  const rel = toRel(file);
  const source = fs.readFileSync(file, 'utf8');
  const usesBroadIsAdmin = /locals\.isAdmin|function\s+isAdmin/.test(source);
  const strict = hasStrictAdminCheck(source);
  return {
    file: rel,
    status: strict ? 'ok' : 'review',
    usesBroadIsAdmin,
    strictAdminRoleCheck: strict,
  };
});

const review = results.filter((item) => item.status !== 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  status: review.length ? 'review' : 'ok',
  policy: {
    highImpactAdminEndpointsRequireStrictAdminRole: true,
    moderatorIsNotEnoughForHighImpactActions: true,
  },
  summary: {
    checked: results.length,
    ok: results.length - review.length,
    review: review.length,
  },
  review,
  results,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Admin Strict Role Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Checked: ${report.summary.checked}`,
    `- Review: ${report.summary.review}`,
    '',
    '| File | Status | Strict Role Check | Broad isAdmin |',
    '|---|---|---|---|',
    ...results.map((item) => `| \`${item.file}\` | ${item.status} | ${item.strictAdminRoleCheck ? 'yes' : 'no'} | ${item.usesBroadIsAdmin ? 'yes' : 'no'} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`admin-strict-role-gate: ${report.status.toUpperCase()} (${report.summary.ok}/${report.summary.checked})`);
process.exitCode = report.status === 'ok' ? 0 : 1;
