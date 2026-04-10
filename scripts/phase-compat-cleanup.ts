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

function buildReport(entries: PhaseCompatEntry[], prunedStaleEntries = 0) {
  const classified = entries.map((entry) => ({
    ...entry,
    status: classifyEntry(entry),
  }));

  return {
    generatedAt: new Date().toISOString(),
    total: classified.length,
    stillUsed: classified.filter((entry) => entry.status === 'still-used').length,
    stale: classified.filter((entry) => entry.status === 'stale').length,
    legacy: classified.filter((entry) => entry.status === 'legacy').length,
    firstStale: classified.find((entry) => entry.status === 'stale')?.scriptName ?? null,
    prunedStaleEntries,
    staleEntries: classified.filter((entry) => entry.status === 'stale').slice(0, 200),
  };
}

function writeReport(report: ReturnType<typeof buildReport>): void {
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
      `- Pruned stale entries: ${report.prunedStaleEntries}`,
      `- First stale: ${report.firstStale || 'none'}`,
    ].join('\n') + '\n',
    'utf8'
  );
}

function main(): void {
  const pruneStale = process.argv.includes('--prune-stale');
  const manifestPath = resolve(process.cwd(), 'config', 'phase-compat-manifest.json');
  const manifest = readPhaseCompatManifest();
  const initialReport = buildReport(manifest.entries);

  if (pruneStale) {
    const retainedEntries = manifest.entries.filter((entry) => classifyEntry(entry) !== 'stale');
    const prunedStaleEntries = manifest.entries.length - retainedEntries.length;
    writeFileSync(manifestPath, `${JSON.stringify({ entries: retainedEntries }, null, 2)}\n`, 'utf8');
    const prunedReport = buildReport(retainedEntries, prunedStaleEntries);
    writeReport(prunedReport);
    console.log(`pruned stale compatibility entries: ${prunedStaleEntries}`);
  } else {
    writeReport(initialReport);
    console.log(JSON.stringify(initialReport, null, 2));
  }
}

main();
