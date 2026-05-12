#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'script-surface-report.json');
const outMd = path.join(docsDir, 'script-surface-report.md');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const scripts = packageJson.scripts || {};
const scriptEntries = Object.entries(scripts);

const preferredFamilies = [
  'dev',
  'runtime',
  'redis',
  'build',
  'preview',
  'type-check',
  'lint',
  'test',
  'db',
  'images',
  'content',
  'openapi',
  'sdk',
  'smoke',
  'api',
  'security',
  'ops',
  'release',
  'frontend',
  'home',
  'route',
  'docs',
  'jobs',
];

function resolveFamily(name) {
  const [prefix] = name.split(':');
  if (preferredFamilies.includes(prefix)) return prefix;
  if (name.includes(':')) return prefix;
  return 'top-level';
}

const familyMap = new Map();
for (const [name, command] of scriptEntries) {
  const family = resolveFamily(name);
  const current = familyMap.get(family) || [];
  current.push({ name, command });
  familyMap.set(family, current);
}

const families = Array.from(familyMap.entries())
  .map(([family, entries]) => ({
    family,
    count: entries.length,
    scripts: entries.sort((a, b) => a.name.localeCompare(b.name)),
  }))
  .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));

const report = {
  generatedAt: new Date().toISOString(),
  totalScripts: scriptEntries.length,
  familyCount: families.length,
  largestFamilies: families.slice(0, 10).map((family) => ({
    family: family.family,
    count: family.count,
  })),
  families,
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  '# Script Surface Report',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Total scripts: ${report.totalScripts}`,
  `- Script families: ${report.familyCount}`,
  '',
  '## Largest Families',
  '',
  ...report.largestFamilies.map((item) => `- \`${item.family}\`: ${item.count}`),
  '',
  '## Family Inventory',
  '',
];

for (const family of families) {
  lines.push(`### ${family.family}`);
  lines.push('');
  lines.push(`- Count: ${family.count}`);
  lines.push(...family.scripts.map((entry) => `- \`${entry.name}\`: \`${entry.command}\``));
  lines.push('');
}

fs.writeFileSync(outMd, `${lines.join('\n')}\n`);

console.log(`script-surface-report: PASS (${report.totalScripts} scripts / ${report.familyCount} families)`);
