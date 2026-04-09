import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export interface PhaseCheckWaitOptions {
  prNumber: number;
  repo: string;
  pollMs: number;
  timeoutMs: number;
}

export function parsePhaseCheckWaitArgs(argv: string[]): PhaseCheckWaitOptions {
  const consumed = new Set<number>();
  const readValue = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    if (index >= 0) {
      consumed.add(index);
      consumed.add(index + 1);
      return argv[index + 1];
    }

    return undefined;
  };
  const repo = readValue('--repo') ?? 'titanai777/sanliurfa';
  const pollMs = Number(readValue('--poll-ms') ?? '5000');
  const timeoutMs = Number(readValue('--timeout-ms') ?? '180000');
  const positional = argv.filter((_, index) => !consumed.has(index));
  const prNumber = Number(positional[0]);

  if (!Number.isFinite(prNumber)) {
    throw new Error('Usage: tsx scripts/phase-check-wait.ts <pr-number> [--repo owner/name] [--poll-ms 5000] [--timeout-ms 180000]');
  }

  return {
    prNumber,
    repo,
    pollMs,
    timeoutMs
  };
}

export function buildPrChecksArgs(options: PhaseCheckWaitOptions, watch = false): string[] {
  const args = ['pr', 'checks', String(options.prNumber), '--repo', options.repo];
  if (watch) {
    args.push('--watch');
  }

  return args;
}

export function checksPublished(output: string): boolean {
  const normalized = output.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return !normalized.includes('no checks reported');
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function waitForPublishedChecks(options: PhaseCheckWaitOptions): void {
  const start = Date.now();

  while (Date.now() - start <= options.timeoutMs) {
    const result = spawnSync('gh', buildPrChecksArgs(options), {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: false
    });

    if (result.status === 0 && checksPublished(result.stdout)) {
      const watchResult = spawnSync('gh', buildPrChecksArgs(options, true), {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: false
      });

      if (typeof watchResult.status === 'number' && watchResult.status !== 0) {
        process.exit(watchResult.status);
      }

      if (watchResult.error) {
        throw watchResult.error;
      }

      return;
    }

    sleep(options.pollMs);
  }

  throw new Error(`Checks did not publish for PR #${options.prNumber} within ${options.timeoutMs}ms.`);
}

export function main(): void {
  waitForPublishedChecks(parsePhaseCheckWaitArgs(process.argv.slice(2)));
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
