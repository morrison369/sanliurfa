import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runPipelineStep, type PipelineStep } from './phase-pipeline';
import { withPhaseLock } from './phase-lock';

export interface PhaseReleaseOptions {
  phaseScripts: string[];
}

export function parsePhaseReleaseArgs(argv: string[]): PhaseReleaseOptions {
  const phaseScripts: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--phase-script') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('Missing value after --phase-script');
      }

      phaseScripts.push(next);
      index += 1;
      continue;
    }

    if (!value.startsWith('--')) {
      phaseScripts.push(value);
    }
  }

  if (phaseScripts.length === 0) {
    throw new Error('Usage: tsx scripts/phase-release.ts --phase-script test:phase:785-790 [--phase-script test:phase:791-796 ...]');
  }

  return { phaseScripts };
}

export function buildPhaseReleaseSteps(options: PhaseReleaseOptions): PipelineStep[] {
  return [
    { command: 'npm', args: ['run', 'phase:env:check'] },
    { command: 'npm', args: ['run', 'phase:sync:tsconfig'] },
    { command: 'npm', args: ['run', 'phase:check:tsconfig'] },
    ...options.phaseScripts.map<PipelineStep>((phaseScript) => ({ command: 'npm', args: ['run', phaseScript] })),
    { command: 'npm', args: ['run', 'lint:phase'] },
    { command: 'npm', args: ['run', 'test:phase:smoke'] },
    { command: 'npm', args: ['run', 'build'] }
  ];
}

export function executePhaseRelease(options: PhaseReleaseOptions): void {
  for (const step of buildPhaseReleaseSteps(options)) {
    runPipelineStep(step);
  }
}

export function main(): void {
  const options = parsePhaseReleaseArgs(process.argv.slice(2));
  withPhaseLock('phase-release', () => executePhaseRelease(options));
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
