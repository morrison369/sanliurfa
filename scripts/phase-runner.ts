import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

type Target = 'prev' | 'latest';

interface PackageJson {
  scripts?: Record<string, string>;
}

function getPhaseScriptOrder(scripts: Record<string, string>): string[] {
  const keys = Object.keys(scripts).filter((key) => /^test:phase:\d+-\d+$/.test(key));
  return keys.sort((a, b) => {
    const [aStart] = a.replace('test:phase:', '').split('-').map(Number);
    const [bStart] = b.replace('test:phase:', '').split('-').map(Number);
    return aStart - bStart;
  });
}

function runScript(scriptName: string): never | void {
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

function main(): void {
  const target = process.argv[2] as Target | undefined;
  if (target !== 'prev' && target !== 'latest') {
    throw new Error('Usage: tsx scripts/phase-runner.ts <prev|latest>');
  }

  const packagePath = resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson;
  const scripts = packageJson.scripts ?? {};
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

  runScript(selected);
}

main();
