import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getPhaseCompatMap, getPhaseCompatOrder, resolvePhaseCompatCommand } from './phase-compat-manifest';

export type Target = 'prev' | 'latest';

export function getPhaseScriptOrder(scripts: Record<string, string>): string[] {
  const keys = Object.keys(scripts).filter((key) => /^test:phase:\d+-\d+$/.test(key));
  return keys.sort((a, b) => {
    const [aStart] = a.replace('test:phase:', '').split('-').map(Number);
    const [bStart] = b.replace('test:phase:', '').split('-').map(Number);
    return aStart - bStart;
  });
}

export function selectPhaseScript(target: Target, scripts: Record<string, string>): string {
  const phaseScripts = getPhaseScriptOrder(scripts);

  if (phaseScripts.length === 0) {
    throw new Error('No phase scripts found (expected test:phase:XXX-YYY).');
  }

  const selected =
    target === 'latest'
      ? phaseScripts[phaseScripts.length - 1]
      : phaseScripts[phaseScripts.length - 2];

  if (!selected) {
    throw new Error('No previous phase script found; define at least two test:phase:XXX-YYY scripts.');
  }

  return selected;
}

export function runScript(scriptName: string): never | void {
  const compatCommand = resolvePhaseCompatCommand(scriptName);
  if (compatCommand) {
    const compatResult = spawnSync(compatCommand, {
      stdio: 'inherit',
      shell: true
    });

    if (typeof compatResult.status === 'number' && compatResult.status !== 0) {
      process.exit(compatResult.status);
    }

    if (compatResult.error) {
      throw compatResult.error;
    }
    return;
  }

  const result = spawnSync('npm', ['run', scriptName], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

export function main(): void {
  const target = process.argv[2] as Target | undefined;
  if (target !== 'prev' && target !== 'latest') {
    throw new Error('Usage: tsx scripts/phase-runner.ts <prev|latest>');
  }

  const scripts = getPhaseCompatMap();
  if (Object.keys(scripts).length === 0) {
    const available = getPhaseCompatOrder();
    throw new Error(`No phase compatibility scripts found in manifest. Available: ${available.join(', ')}`);
  }
  const selected = selectPhaseScript(target, scripts);
  runScript(selected);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
