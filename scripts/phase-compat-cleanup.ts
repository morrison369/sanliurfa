import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readPhaseCompatManifest, type PhaseCompatEntry } from './phase-compat-manifest';

function classifyEntry(entry: PhaseCompatEntry): 'still-used' | 'stale' | 'legacy' {
  const match = entry.command.match(/^vitest run(?: --passWithNoTests)? (.+)$/);
  if (!match) {
    return 'legacy';
  }

  const targets = match[1]
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token && !token.startsWith('-'));
  if (targets.length === 0) {
    return 'legacy';
  }

  const allTargetsExist = targets.every((target) => {
    const filePath = resolve(process.cwd(), target);
    return existsSync(filePath);
  });
  return allTargetsExist ? 'still-used' : 'stale';
}

function main(): void {
  const pruneStale = process.argv.includes('--prune-stale');
  const manifestPath = resolve(process.cwd(), 'config', 'phase-compat-manifest.json');
  const manifest = readPhaseCompatManifest();
  const classified = manifest.entries.map((entry) => ({
    ...entry,
    status: classifyEntry(entry),
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    total: classified.length,
    stillUsed: classified.filter((entry) => entry.status === 'still-used').length,
    stale: classified.filter((entry) => entry.status === 'stale').length,
    legacy: classified.filter((entry) => entry.status === 'legacy').length,
    firstStale: classified.find((entry) => entry.status === 'stale')?.scriptName ?? null,
    staleEntries: classified.filter((entry) => entry.status === 'stale').slice(0, 200),
  };

  const reportDir = resolve(process.cwd(), 'docs', 'reports');
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(resolve(reportDir, 'phase-compat-cleanup.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(
    resolve(reportDir, 'phase-compat-cleanup.md'),
    [
      '# Phase Compat Cleanup',
      `- Generated at: ${report.generatedAt}`,
      `- Total: ${report.total}`,
      `- Still used: ${report.stillUsed}`,
      `- Stale: ${report.stale}`,
      `- Legacy: ${report.legacy}`,
      `- First stale: ${report.firstStale || 'none'}`,
    ].join('\n') + '\n',
    'utf8'
  );

  if (pruneStale) {
    const retainedEntries = classified.filter((entry) => entry.status !== 'stale').map(({ status, ...entry }) => entry);
    writeFileSync(manifestPath, `${JSON.stringify({ entries: retainedEntries }, null, 2)}\n`, 'utf8');
    console.log(`pruned stale compatibility entries: ${classified.length - retainedEntries.length}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main();
