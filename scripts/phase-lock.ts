import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface PhaseLockMetadata {
  pid: number;
  operation: string;
  startedAt: string;
  cwd: string;
}

export const phaseLockFileName = '.phase-worktree.lock';

export function getPhaseLockPath(cwd: string = process.cwd()): string {
  return resolve(cwd, phaseLockFileName);
}

export function readPhaseLock(lockPath: string): PhaseLockMetadata | null {
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(lockPath, 'utf8')) as PhaseLockMetadata;
  } catch {
    return null;
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function buildPhaseLockError(lockPath: string, existing: PhaseLockMetadata | null): string {
  if (!existing) {
    return `Phase worktree lock already exists at ${lockPath}. Remove it if the previous run crashed.`;
  }

  return [
    `Phase worktree is already locked by ${existing.operation}.`,
    `Lock file: ${lockPath}`,
    `PID: ${existing.pid}`,
    `Started: ${existing.startedAt}`,
    `CWD: ${existing.cwd}`
  ].join(' ');
}

export function acquirePhaseLock(operation: string, cwd: string = process.cwd()): string {
  const lockPath = getPhaseLockPath(cwd);
  const existing = readPhaseLock(lockPath);

  if (existing && !isProcessAlive(existing.pid)) {
    rmSync(lockPath, { force: true });
  }

  const payload: PhaseLockMetadata = {
    pid: process.pid,
    operation,
    startedAt: new Date().toISOString(),
    cwd
  };

  try {
    const fd = openSync(lockPath, 'wx');
    writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    closeSync(fd);
    return lockPath;
  } catch (error) {
    const metadata = readPhaseLock(lockPath);
    throw new Error(buildPhaseLockError(lockPath, metadata), { cause: error as Error });
  }
}

export function releasePhaseLock(lockPath: string): void {
  rmSync(lockPath, { force: true });
}

export function withPhaseLock<T>(operation: string, runner: () => T, cwd: string = process.cwd()): T {
  const lockPath = acquirePhaseLock(operation, cwd);
  try {
    return runner();
  } finally {
    releasePhaseLock(lockPath);
  }
}
