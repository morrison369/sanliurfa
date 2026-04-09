import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runPipelineStep, type PipelineStep } from './phase-pipeline';
import { withPhaseLock } from './phase-lock';

export interface PhaseGateOptions {
  ci: boolean;
}

export function parsePhaseGateArgs(argv: string[]): PhaseGateOptions {
  return {
    ci: argv.includes('--ci')
  };
}

export function buildPhaseGateSteps(options: PhaseGateOptions): PipelineStep[] {
  const steps: PipelineStep[] = [];
  if (options.ci) {
    steps.push({ command: 'npm', args: ['run', 'phase:check:tsconfig'] });
  }

  steps.push(
    { command: 'npm', args: ['run', 'lint:phase'] },
    { command: 'npm', args: ['run', 'test:phase:smoke'] },
    { command: 'npm', args: ['run', 'build'] }
  );

  return steps;
}

export function executePhaseGate(options: PhaseGateOptions): void {
  for (const step of buildPhaseGateSteps(options)) {
    runPipelineStep(step);
  }
}

export function main(): void {
  const options = parsePhaseGateArgs(process.argv.slice(2));
  withPhaseLock(options.ci ? 'phase-gate-ci' : 'phase-gate', () => executePhaseGate(options));
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
