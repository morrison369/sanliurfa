import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPhaseCompatMap } from './phase-compat-manifest';

interface PackageJson {
  scripts?: Record<string, string>;
}

export interface ScriptSurfaceReport {
  compatibilityPhaseScripts: string[];
  runnerScripts: string[];
  firstCompatibilityScript: string | null;
  lastCompatibilityScript: string | null;
  stillUsedCompatibilityScripts: number;
  staleCompatibilityScripts: number;
  legacyCompatibilityScripts: number;
  firstStaleCompatibilityScript: string | null;
}

function classifyCompatibilityCommand(command: string): 'still-used' | 'stale' | 'legacy' {
  const match = command.match(/^vitest run(?: --passWithNoTests)? (.+)$/);
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

  const allTargetsExist = targets.every((target) => existsSync(resolve(process.cwd(), target)));
  return allTargetsExist ? 'still-used' : 'stale';
}

export function buildScriptSurfaceReport(scripts: Record<string, string>): ScriptSurfaceReport {
  const compatibilityPhaseScripts = Object.keys(scripts)
    .filter((key) => /^test:phase:\d+-\d+$/.test(key))
    .sort((left, right) => {
      const [leftStart] = left.replace('test:phase:', '').split('-').map(Number);
      const [rightStart] = right.replace('test:phase:', '').split('-').map(Number);
      return leftStart - rightStart;
    });

  const runnerScripts = [
    'test:phase:prev',
    'test:phase:latest',
    'test:phase:range',
    'test:phase:batch',
    'phase:prepare:block',
    'phase:prepare:block:preferred',
    'phase:prepare:batch',
    'phase:prepare:batch:preferred',
    'phase:doctor',
    'phase:changelog:normalize'
  ].filter((key) => key in scripts);

  const compatibilityStatusEntries = compatibilityPhaseScripts.map((scriptName) => ({
    scriptName,
    status: classifyCompatibilityCommand(scripts[scriptName] || '')
  }));

  return {
    compatibilityPhaseScripts,
    runnerScripts,
    firstCompatibilityScript: compatibilityPhaseScripts[0] ?? null,
    lastCompatibilityScript: compatibilityPhaseScripts[compatibilityPhaseScripts.length - 1] ?? null,
    stillUsedCompatibilityScripts: compatibilityStatusEntries.filter((entry) => entry.status === 'still-used').length,
    staleCompatibilityScripts: compatibilityStatusEntries.filter((entry) => entry.status === 'stale').length,
    legacyCompatibilityScripts: compatibilityStatusEntries.filter((entry) => entry.status === 'legacy').length,
    firstStaleCompatibilityScript:
      compatibilityStatusEntries.find((entry) => entry.status === 'stale')?.scriptName ?? null
  };
}

export function renderScriptSurfaceReport(report: ScriptSurfaceReport): string {
  return [
    'phase-scripts-report',
    `compatibilityPhaseScripts=${report.compatibilityPhaseScripts.length}`,
    `compatibilityRange=${report.firstCompatibilityScript ?? 'none'}..${report.lastCompatibilityScript ?? 'none'}`,
    `compatibilityStillUsed=${report.stillUsedCompatibilityScripts}`,
    `compatibilityStale=${report.staleCompatibilityScripts}`,
    `compatibilityLegacy=${report.legacyCompatibilityScripts}`,
    `compatibilityFirstStale=${report.firstStaleCompatibilityScript ?? 'none'}`,
    `runnerScripts=${report.runnerScripts.join(', ') || 'none'}`,
    'policy=runner-first; test:phase:<range> entries are compatibility-only'
  ].join('\n');
}

export function main(): void {
  const packagePath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson;
  const report = buildScriptSurfaceReport({
    ...(packageJson.scripts ?? {}),
    ...getPhaseCompatMap()
  });
  process.stdout.write(`${renderScriptSurfaceReport(report)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
