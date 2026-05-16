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
const commandMap = new Map();
for (const [name, command] of scriptEntries) {
  const family = resolveFamily(name);
  const current = familyMap.get(family) || [];
  current.push({ name, command });
  familyMap.set(family, current);

  const commandKey = String(command).trim();
  const aliases = commandMap.get(commandKey) || [];
  aliases.push(name);
  commandMap.set(commandKey, aliases);
}

const families = Array.from(familyMap.entries())
  .map(([family, entries]) => ({
    family,
    count: entries.length,
    scripts: entries.sort((a, b) => a.name.localeCompare(b.name)),
  }))
  .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));

const topLevelScripts = (familyMap.get('top-level') || []).map((entry) => entry.name).sort();
const exactCommandAliases = Array.from(commandMap.entries())
  .filter(([, names]) => names.length > 1)
  .map(([command, names]) => ({
    command,
    names: names.sort((a, b) => a.localeCompare(b)),
  }))
  .sort((a, b) => b.names.length - a.names.length || a.command.localeCompare(b.command))
  .slice(0, 25);

const retirementCandidates = scriptEntries
  .filter(([name]) =>
    name.startsWith('ops:targeted:') ||
    name.startsWith('test:e2e:astro:') ||
    name.endsWith(':dry') ||
    name.endsWith(':dry-run') ||
    name.includes(':debug') ||
    name.includes(':ui')
  )
  .map(([name, command]) => ({
    name,
    command,
    reason: name.startsWith('ops:targeted:')
      ? 'ops:targeted ana komutu scope argumani destekliyor'
      : 'niche/manual runner; kanonik gate disinda tutulabilir',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const report = {
  generatedAt: new Date().toISOString(),
  totalScripts: scriptEntries.length,
  familyCount: families.length,
  topLevelCount: topLevelScripts.length,
  topLevelScripts,
  exactCommandAliasCount: exactCommandAliases.length,
  exactCommandAliases,
  retirementCandidateCount: retirementCandidates.length,
  retirementCandidates,
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
  `- Top-level scripts: ${report.topLevelCount}`,
  `- Exact command alias count: ${report.exactCommandAliasCount}`,
  `- Retirement candidate count: ${report.retirementCandidateCount}`,
  '',
  '## Largest Families',
  '',
  ...report.largestFamilies.map((item) => `- \`${item.family}\`: ${item.count}`),
  '',
  '## Top-Level Scripts',
  '',
  ...(report.topLevelScripts.length > 0 ? report.topLevelScripts.map((name) => `- \`${name}\``) : ['- yok']),
  '',
  '## Exact Command Aliases',
  '',
  ...(report.exactCommandAliases.length > 0
    ? report.exactCommandAliases.map((item) => `- ${item.names.map((name) => `\`${name}\``).join(', ')} → \`${item.command}\``)
    : ['- exact alias bulunmadı']),
  '',
  '## Retirement Candidates',
  '',
  ...(report.retirementCandidates.length > 0
    ? report.retirementCandidates.map((item) => `- \`${item.name}\`: ${item.reason}`)
    : ['- retirement candidate bulunmadı']),
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
