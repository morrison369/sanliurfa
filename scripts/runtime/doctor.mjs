#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const runtimeRoot = join(root, '.project-runtime');
const runDir = join(runtimeRoot, 'run');
const logsDir = join(runtimeRoot, 'logs');
const devLock = join(runDir, 'dev.lock');
const taskLock = join(runDir, 'task.lock');
const devPidFile = join(runDir, 'dev.pid');
const watchdogPidFile = join(runDir, 'watchdog.pid');
const port = Number(process.env.PORT || '4321');
const shouldFix = process.argv.includes('--fix');

mkdirSync(runDir, { recursive: true });
mkdirSync(logsDir, { recursive: true });

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readFirstLine(path) {
  if (!existsSync(path)) return null;
  const txt = readFileSync(path, 'utf8').split(/\r?\n/)[0].trim();
  const n = Number(txt);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function run(cmd) {
  const res = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'sh',
    process.platform === 'win32' ? ['/d', '/s', '/c', cmd] : ['-lc', cmd],
    { cwd: root, encoding: 'utf8' });
  return res;
}

async function health() {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    let payload = null;
    const raw = await res.text();
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {}

    const degradedWithDb =
      res.status === 503 &&
      payload &&
      payload.status === 'degraded' &&
      payload.services &&
      payload.services.database &&
      payload.services.database.status === 'connected';

    if (res.ok) return { ok: true, status: res.status, mode: 'ok' };
    if (degradedWithDb) return { ok: true, status: res.status, mode: 'degraded-db-only' };
    return { ok: false, status: res.status, mode: 'down' };
  } catch {
    return { ok: false, status: 0, mode: 'down' };
  }
}

function staleLockInfo(lockPath) {
  const pid = readFirstLine(lockPath);
  if (!pid) return { exists: existsSync(lockPath), pid: null, stale: existsSync(lockPath) };
  return { exists: true, pid, stale: !isAlive(pid) };
}

function printLine(label, value) {
  console.log(`${label}: ${value}`);
}

async function main() {
  const dev = staleLockInfo(devLock);
  const task = staleLockInfo(taskLock);
  const devPid = readFirstLine(devPidFile);
  const watchdogPid = readFirstLine(watchdogPidFile);
  const devRunning = !!dev.pid && isAlive(dev.pid);
  const watchdogRunning = !!watchdogPid && isAlive(watchdogPid);
  const h = await health();

  console.log('## Isolated Runtime Doctor');
  printLine('dev.lock', dev.exists ? `${dev.pid ?? 'invalid'} (${dev.stale ? 'stale' : 'ok'})` : 'missing');
  printLine('task.lock', task.exists ? `${task.pid ?? 'invalid'} (${task.stale ? 'stale' : 'ok'})` : 'missing');
  printLine('dev.pid', devPid ? `${devPid} (${isAlive(devPid) ? 'alive' : 'stale'})` : 'missing');
  printLine('watchdog.pid', watchdogPid ? `${watchdogPid} (${watchdogRunning ? 'alive' : 'stale'})` : 'missing');
  printLine('dev.process', devRunning ? `running (${dev.pid})` : 'stopped');
  printLine('watchdog.process', watchdogRunning ? `running (${watchdogPid})` : 'stopped');
  printLine('health', h.ok ? `ok (${h.status}, ${h.mode})` : `down (${h.status}, ${h.mode})`);

  const issues = [];
  if (dev.stale) issues.push('stale dev.lock');
  if (task.stale) issues.push('stale task.lock');
  if (devRunning && !h.ok) issues.push('dev running but unhealthy');
  if (!devRunning && watchdogRunning) issues.push('watchdog running without dev process');

  if (issues.length === 0) {
    console.log('result: healthy');
    process.exit(0);
  }

  console.log(`result: issues (${issues.join(', ')})`);

  if (!shouldFix) {
    process.exit(1);
  }

  console.log('fix: starting automatic remediation...');
  if (dev.stale) {
    try { unlinkSync(devLock); } catch {}
    console.log('fix: removed stale dev.lock');
  }
  if (task.stale) {
    try { unlinkSync(taskLock); } catch {}
    console.log('fix: removed stale task.lock');
  }

  if (!watchdogRunning) {
    run('npm run -s dev:isolated:watchdog:start');
    console.log('fix: started watchdog');
  }

  run('npm run -s dev:isolated:ensure');
  const h2 = await health();
  if (!h2.ok) {
    run('npm run -s dev:isolated:restart');
  }

  const h3 = await health();
  console.log(`fix: final health ${h3.ok ? `ok (${h3.status})` : `down (${h3.status})`}`);
  process.exit(h3.ok ? 0 : 1);
}

main().catch(() => process.exit(1));
