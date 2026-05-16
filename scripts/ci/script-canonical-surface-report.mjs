#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'script-canonical-surface-report.json');
const outMd = path.join(docsDir, 'script-canonical-surface-report.md');

const canonicalCommands = [
  { area: 'local_release', command: 'release:local:fast', purpose: 'Local release readiness minimum gate' },
  { area: 'quality', command: 'quality:reports:refresh', purpose: 'Regenerate release evidence artifacts' },
  { area: 'quality', command: 'quality:metrics', purpose: 'Read-only quality summary' },
  { area: 'astro', command: 'type-check', purpose: 'Astro framework type/schema check' },
  { area: 'build', command: 'build', purpose: 'Astro SSR production build' },
  { area: 'storage', command: 'storage:local:gate', purpose: 'Local filesystem media model enforcement' },
  { area: 'uploads', command: 'images:uploads:parity', purpose: 'Local upload reference parity' },
  { area: 'uploads', command: 'images:uploads:bucket-quota', purpose: 'Per-bucket local storage quota' },
  { area: 'db', command: 'db:retirement:observe', purpose: 'DB retirement observation evidence' },
  { area: 'db', command: 'db:p0:quarantine:plan', purpose: 'Manual-only DB P0 quarantine plan' },
  { area: 'e2e', command: 'e2e:critical:coverage', purpose: 'Critical flow E2E coverage evidence' },
  { area: 'adsense', command: 'adsense:readiness', purpose: 'Local AdSense file/meta readiness' },
  { area: 'adsense', command: 'adsense:readiness:live', purpose: 'Live AdSense crawler readiness' },
  { area: 'runtime', command: 'redis:runtime:health:report', purpose: 'Redis advisory health snapshot' },
  { area: 'runtime', command: 'warmup:safety:report', purpose: 'Warmup no-port/no-server safety' },
];

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = pkg.scripts || {};
const missingCanonical = canonicalCommands.filter((item) => !scripts[item.command]);
const totalScripts = Object.keys(scripts).length;
const familyCounts = Object.keys(scripts).reduce((acc, name) => {
  const family = name.includes(':') ? name.split(':')[0] : name;
  acc[family] = (acc[family] || 0) + 1;
  return acc;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  status: missingCanonical.length === 0 ? 'ok' : 'blocked',
  summary: {
    totalScripts,
    familyCount: Object.keys(familyCounts).length,
    canonicalCount: canonicalCommands.length,
    missingCanonicalCount: missingCanonical.length,
  },
  policy: {
    destructiveScriptRetirementAllowed: false,
    packageScriptDeletionAllowed: false,
    canonicalCommandsArePreferredForCi: true,
  },
  canonicalCommands: canonicalCommands.map((item) => ({
    ...item,
    exists: Boolean(scripts[item.command]),
    packageCommand: scripts[item.command] || null,
  })),
  largestFamilies: Object.entries(familyCounts)
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family))
    .slice(0, 15),
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Script Canonical Surface Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Total scripts: ${report.summary.totalScripts}`,
    `- Families: ${report.summary.familyCount}`,
    `- Missing canonical commands: ${report.summary.missingCanonicalCount}`,
    '',
    '## Canonical Commands',
    '',
    '| Area | Command | Exists | Purpose |',
    '|---|---|---|---|',
    ...report.canonicalCommands.map(
      (item) => `| ${item.area} | \`${item.command}\` | ${item.exists ? 'yes' : 'no'} | ${item.purpose} |`,
    ),
    '',
    '## Largest Families',
    '',
    '| Family | Count |',
    '|---|---:|',
    ...report.largestFamilies.map((item) => `| ${item.family} | ${item.count} |`),
    '',
    'Not: Bu rapor script silmez. Ama CI ve release dokümantasyonunda kanonik komutları öne çıkarır.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `script-canonical-surface-report: ${report.status.toUpperCase()} (${report.summary.canonicalCount} canonical, ${report.summary.missingCanonicalCount} missing)`,
);
process.exit(missingCanonical.length === 0 ? 0 : 1);
