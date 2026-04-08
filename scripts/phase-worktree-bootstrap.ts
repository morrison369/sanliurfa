import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface WorktreeBootstrapOptions {
  rootDir: string;
  worktreePath: string;
  branchName: string;
  baseRef: string;
  installDependencies: boolean;
}

export interface WorktreeBootstrapStep {
  command: string;
  args: string[];
  cwd: string;
}

export function buildWorktreeBootstrapSteps(options: WorktreeBootstrapOptions): WorktreeBootstrapStep[] {
  const steps: WorktreeBootstrapStep[] = [
    {
      command: 'git',
      args: ['fetch', 'origin'],
      cwd: options.rootDir
    },
    {
      command: 'git',
      args: ['worktree', 'add', options.worktreePath, '-b', options.branchName, options.baseRef],
      cwd: options.rootDir
    }
  ];

  if (options.baseRef === 'origin/master') {
    steps.push({
      command: 'git',
      args: ['pull', '--ff-only', 'origin', 'master'],
      cwd: options.worktreePath
    });
  }

  if (options.installDependencies) {
    steps.push({
      command: 'npm',
      args: ['ci'],
      cwd: options.worktreePath
    });
  }

  return steps;
}

export function runBootstrapSteps(steps: WorktreeBootstrapStep[]): void {
  for (const step of steps) {
    const result = spawnSync(step.command, step.args, {
      cwd: step.cwd,
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
}

export function parseBootstrapArgs(argv: string[]): WorktreeBootstrapOptions {
  const [worktreePathArg, branchName, baseRefArg] = argv;
  if (!worktreePathArg || !branchName) {
    throw new Error('Usage: tsx scripts/phase-worktree-bootstrap.ts <worktreePath> <branchName> [baseRef] [--skip-install]');
  }

  return {
    rootDir: process.cwd(),
    worktreePath: resolve(worktreePathArg),
    branchName,
    baseRef: baseRefArg && !baseRefArg.startsWith('--') ? baseRefArg : 'origin/master',
    installDependencies: !argv.includes('--skip-install')
  };
}

export function main(): void {
  const options = parseBootstrapArgs(process.argv.slice(2));
  const steps = buildWorktreeBootstrapSteps(options);
  runBootstrapSteps(steps);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
