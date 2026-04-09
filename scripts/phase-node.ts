import { existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSupportedNodeVersion, parseNodeVersion } from './phase-env';

export interface PhaseNodeCommand {
  mode: 'run-script' | 'run-tsx';
  target: string;
  args: string[];
}

export function compareSemver(a: string, b: string): number {
  const parsedA = parseNodeVersion(a.replace(/^v/, ''));
  const parsedB = parseNodeVersion(b.replace(/^v/, ''));
  if (parsedA.major !== parsedB.major) {
    return parsedA.major - parsedB.major;
  }

  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor - parsedB.minor;
  }

  return parsedA.patch - parsedB.patch;
}

export function resolvePreferredNodeExecutable(): string {
  if (isSupportedNodeVersion(process.version)) {
    return process.execPath;
  }

  if (process.env.PHASE_NODE_EXE && existsSync(process.env.PHASE_NODE_EXE)) {
    return process.env.PHASE_NODE_EXE;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    throw new Error('LOCALAPPDATA is not defined; cannot resolve preferred Node executable.');
  }

  const nvmRoot = join(localAppData, 'nvm');
  if (!existsSync(nvmRoot)) {
    throw new Error(`NVM root not found at ${nvmRoot}.`);
  }

  const versions = readdirSync(nvmRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^v22\.\d+\.\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort(compareSemver);
  const selected = versions[versions.length - 1];
  if (!selected) {
    throw new Error(`No supported Node 22.x installation found under ${nvmRoot}.`);
  }

  const executable = join(nvmRoot, selected, 'node.exe');
  if (!existsSync(executable)) {
    throw new Error(`Resolved Node executable is missing: ${executable}`);
  }

  return executable;
}

export function parsePhaseNodeArgs(argv: string[]): PhaseNodeCommand {
  const [mode, target, ...args] = argv;
  if ((mode !== 'run-script' && mode !== 'run-tsx') || !target) {
    throw new Error('Usage: tsx scripts/phase-node.ts <run-script|run-tsx> <target> [...args]');
  }

  return {
    mode,
    target,
    args
  };
}

export function buildPhaseNodeInvocation(command: PhaseNodeCommand): { executable: string; args: string[] } {
  const nodeExecutable = resolvePreferredNodeExecutable();
  if (command.mode === 'run-script') {
    const npmCli = resolve(process.env.APPDATA ?? '', 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js');
    return {
      executable: nodeExecutable,
      args: [npmCli, 'run', command.target, '--', ...command.args]
    };
  }

  const tsxCli = resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  return {
    executable: nodeExecutable,
    args: [tsxCli, command.target, ...command.args]
  };
}

export function runPhaseNodeCommand(command: PhaseNodeCommand): void {
  const invocation = buildPhaseNodeInvocation(command);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      PHASE_PREFERRED_NODE_EXE: invocation.executable
    }
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

export function main(): void {
  runPhaseNodeCommand(parsePhaseNodeArgs(process.argv.slice(2)));
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
