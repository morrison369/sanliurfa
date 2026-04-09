import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPhaseScriptOrder, runScript } from './phase-runner';

interface PackageJson {
  scripts?: Record<string, string>;
}

type Mode = 'range' | 'batch';

function readScripts(): Record<string, string> {
  const packagePath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson;
  return packageJson.scripts ?? {};
}

export function toScriptName(range: string): string {
  if (!/^\d+-\d+$/.test(range)) {
    throw new Error(`Invalid phase range: ${range}`);
  }

  return `test:phase:${range}`;
}

export function ensureScriptExists(scriptName: string, scripts: Record<string, string>): void {
  if (!(scriptName in scripts)) {
    const available = getPhaseScriptOrder(scripts);
    throw new Error(`Unknown phase script: ${scriptName}. Available ranges: ${available.join(', ')}`);
  }
}

export function parsePhaseTestArgs(argv: string[]): { mode: Mode; ranges: string[] } {
  const [mode, ...args] = argv as [Mode | undefined, ...string[]];
  if (mode !== 'range' && mode !== 'batch') {
    throw new Error('Usage: tsx scripts/phase-test.ts <range|batch> <947-952> [953-958 ...]');
  }

  if (args.length === 0) {
    throw new Error('Provide at least one phase range.');
  }

  return { mode, ranges: args };
}

export function main(): void {
  const { mode, ranges } = parsePhaseTestArgs(process.argv.slice(2));

  const scripts = readScripts();
  const scriptNames = ranges.map(toScriptName);
  scriptNames.forEach((scriptName) => ensureScriptExists(scriptName, scripts));

  if (mode === 'range') {
    if (scriptNames.length !== 1) {
      throw new Error('Range mode accepts exactly one phase range.');
    }
    runScript(scriptNames[0]);
    return;
  }

  for (const scriptName of scriptNames) {
    runScript(scriptName);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
