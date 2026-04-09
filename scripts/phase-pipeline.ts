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

interface PreferredTsxStep {
  script: string;
  args: string[];
}

export function resolvePreferredTsxStep(step: PipelineStep): PreferredTsxStep | null {
  if (step.command !== 'npm' || step.args[0] !== 'run') {
    return null;
  }

  const scriptName = step.args[1];
  switch (scriptName) {
    case 'phase:env:check':
      return { script: 'scripts/phase-env.ts', args: [] };
    case 'phase:sync:tsconfig':
      return { script: 'scripts/update-phase-tsconfig.ts', args: [] };
    case 'phase:check:tsconfig':
      return { script: 'scripts/update-phase-tsconfig.ts', args: ['--check'] };
    default:
      return null;
  }
}

export function buildPhasePipelineEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const preferredNode = env.PHASE_PREFERRED_NODE_EXE;
  if (!preferredNode) {
    return env;
  }

  return {
    ...env,
    npm_node_execpath: preferredNode
  };
}

export function buildPipelineStepInvocation(
  step: PipelineStep,
  env: NodeJS.ProcessEnv = process.env
): { command: string; args: string[]; shell: boolean; env: NodeJS.ProcessEnv } {
  const pipelineEnv = buildPhasePipelineEnv(env);
  const preferredNode = pipelineEnv.PHASE_PREFERRED_NODE_EXE;
  if (preferredNode && step.command === 'npm') {
    const preferredTsxStep = resolvePreferredTsxStep(step);
    if (preferredTsxStep) {
      const tsxCli = resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
      return {
        command: preferredNode,
        args: [tsxCli, preferredTsxStep.script, ...preferredTsxStep.args],
        shell: false,
        env: pipelineEnv
      };
    }

    const appData = pipelineEnv.APPDATA;
    if (!appData) {
      throw new Error('APPDATA is not defined; cannot resolve npm-cli.js for preferred Node execution.');
    }

    const npmCli = resolve(appData, 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js');
    return {
      command: preferredNode,
      args: [npmCli, ...step.args],
      shell: false,
      env: pipelineEnv
    };
  }

  return {
    command: step.command,
    args: step.args,
    shell: process.platform === 'win32',
    env: pipelineEnv
  };
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
  const invocation = buildPipelineStepInvocation(step);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: invocation.shell,
    env: invocation.env
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
