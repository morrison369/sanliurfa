import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export interface PhasePipelineOptions {
  phaseScript?: string;
}

export interface PipelineStep {
  command: string;
  args: string[];
}

export function parsePhasePipelineArgs(argv: string[]): PhasePipelineOptions {
  const index = argv.indexOf('--phase-script');
  const explicit = index >= 0 ? argv[index + 1] : undefined;
  const positional = argv.find((arg, argIndex) => !(index >= 0 && argIndex === index + 1) && !arg.startsWith('--'));
  const phaseScript = explicit ?? positional;
  return { phaseScript };
}

export function buildPhasePipelineSteps(options: PhasePipelineOptions): PipelineStep[] {
  const steps: PipelineStep[] = [
    { command: 'npm', args: ['run', 'phase:env:check'] },
    { command: 'npm', args: ['run', 'phase:sync:tsconfig'] },
    { command: 'npm', args: ['run', 'phase:check:tsconfig'] }
  ];

  if (options.phaseScript) {
    steps.push({ command: 'npm', args: ['run', options.phaseScript] });
  }

  steps.push(
    { command: 'npm', args: ['run', 'lint:phase'] },
    { command: 'npm', args: ['run', 'test:phase:smoke'] },
    { command: 'npm', args: ['run', 'build'] }
  );

  return steps;
}

export function runPipelineStep(step: PipelineStep): void {
  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
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
  const options = parsePhasePipelineArgs(process.argv.slice(2));
  const steps = buildPhasePipelineSteps(options);
  for (const step of steps) {
    runPipelineStep(step);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
