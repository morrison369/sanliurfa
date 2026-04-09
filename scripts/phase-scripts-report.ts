import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageJson {
  scripts?: Record<string, string>;
}

export interface ScriptSurfaceReport {
  compatibilityPhaseScripts: string[];
  runnerScripts: string[];
  firstCompatibilityScript: string | null;
  lastCompatibilityScript: string | null;
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

  return {
    compatibilityPhaseScripts,
    runnerScripts,
    firstCompatibilityScript: compatibilityPhaseScripts[0] ?? null,
    lastCompatibilityScript: compatibilityPhaseScripts[compatibilityPhaseScripts.length - 1] ?? null
  };
}

export function renderScriptSurfaceReport(report: ScriptSurfaceReport): string {
  return [
    'phase-scripts-report',
    `compatibilityPhaseScripts=${report.compatibilityPhaseScripts.length}`,
    `compatibilityRange=${report.firstCompatibilityScript ?? 'none'}..${report.lastCompatibilityScript ?? 'none'}`,
    `runnerScripts=${report.runnerScripts.join(', ') || 'none'}`,
    'policy=runner-first; test:phase:<range> entries are compatibility-only'
  ].join('\n');
}

export function main(): void {
  const packagePath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson;
  const report = buildScriptSurfaceReport(packageJson.scripts ?? {});
  process.stdout.write(`${renderScriptSurfaceReport(report)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
