#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const runtimeRoot = path.join(root, '.project-runtime');
const runDir = path.join(runtimeRoot, 'run');
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'runtime-health-report.json');
const outMd = path.join(docsDir, 'runtime-health-report.md');
const port = Number(process.env.PORT || '4321');
const fix = process.argv.includes('--fix');

function readPid(fileName) {
  const fullPath = path.join(runDir, fileName);
  if (!fs.existsSync(fullPath)) return null;
  const raw = fs.readFileSync(fullPath, 'utf8').trim().split(/\r?\n/)[0];
  const pid = Number(raw);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function run(cmd) {
  const res = spawnSync(
    process.platform === 'win32' ? 'cmd.exe' : 'sh',
    process.platform === 'win32' ? ['/d', '/s', '/c', cmd] : ['-lc', cmd],
    { cwd: root, encoding: 'utf8' }
  );
  return {
    ok: res.status === 0,
    status: res.status ?? 1,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

async function fetchHealth() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {}

    const degradedWithDb =
      response.status === 503 &&
      data &&
      data.status === 'degraded' &&
      data.services &&
      data.services.database &&
      data.services.database.status === 'connected';

    return {
      ok: response.ok || degradedWithDb,
      status: response.status,
      mode: response.ok ? 'ok' : degradedWithDb ? 'degraded-db-only' : 'down',
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      mode: 'down',
      error: error instanceof Error ? error.message : String(error),
      data: null,
    };
  }
}

function collectLocks() {
  const devLockPid = readPid('dev.lock');
  const taskLockPid = readPid('task.lock');
  return {
    devLock: {
      exists: fs.existsSync(path.join(runDir, 'dev.lock')),
      pid: devLockPid,
      stale: !!devLockPid && !isAlive(devLockPid),
    },
    taskLock: {
      exists: fs.existsSync(path.join(runDir, 'task.lock')),
      pid: taskLockPid,
      stale: !!taskLockPid && !isAlive(taskLockPid),
    },
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Runtime Health Report');
  lines.push('');
  lines.push(`- Generated At: ${report.generatedAt}`);
  lines.push(`- Port: ${report.port}`);
  lines.push(`- Health: ${report.health.ok ? 'ok' : 'down'} (${report.health.status}, ${report.health.mode})`);
  lines.push(`- Orphan Check: ${report.orphanCheck.ok ? 'ok' : 'fail'}`);
  lines.push(`- Doctor: ${report.doctor.ok ? 'ok' : 'fail'} (exit=${report.doctor.status})`);
  lines.push(`- Fix Attempted: ${report.fixAttempted ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Locks');
  lines.push('');
  lines.push(`- dev.lock: ${report.locks.devLock.exists ? 'exists' : 'missing'}, pid=${report.locks.devLock.pid ?? 'n/a'}, stale=${report.locks.devLock.stale ? 'yes' : 'no'}`);
  lines.push(`- task.lock: ${report.locks.taskLock.exists ? 'exists' : 'missing'}, pid=${report.locks.taskLock.pid ?? 'n/a'}, stale=${report.locks.taskLock.stale ? 'yes' : 'no'}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function snapshot() {
  const locks = collectLocks();
  const devPid = readPid('dev.pid');
  const watchdogPid = readPid('watchdog.pid');
  const health = await fetchHealth();
  const doctor = run('node scripts/runtime/doctor.mjs');
  const orphanCheck = run('node scripts/runtime/check-no-orphan-dev.mjs');
  const runtimeStopped =
    !locks.devLock.exists &&
    !locks.taskLock.exists &&
    !devPid &&
    !watchdogPid &&
    !health.ok &&
    health.status === 0;

  return {
    generatedAt: new Date().toISOString(),
    port,
    locks,
    pids: {
      devPid,
      devAlive: isAlive(devPid),
      watchdogPid,
      watchdogAlive: isAlive(watchdogPid),
    },
    health,
    doctor,
    orphanCheck,
    runtimeStopped,
  };
}

async function main() {
  fs.mkdirSync(docsDir, { recursive: true });

  let report = await snapshot();
  let fixAttempted = false;
  const unhealthy =
    !report.health.ok ||
    !report.orphanCheck.ok ||
    report.locks.devLock.stale ||
    report.locks.taskLock.stale;

  if (fix && unhealthy) {
    fixAttempted = true;
    run('node scripts/runtime/doctor.mjs --fix');
    report = await snapshot();
  }

  const finalReport = {
    ...report,
    health:
      report.runtimeStopped
        ? {
            ...report.health,
            ok: true,
            mode: 'stopped',
          }
        : report.health,
    fixAttempted,
  };

  fs.writeFileSync(outJson, JSON.stringify(finalReport, null, 2), 'utf8');
  fs.writeFileSync(outMd, buildMarkdown(finalReport), 'utf8');

  console.log(`runtime health report: ${outJson}`);
  console.log(`runtime health markdown: ${outMd}`);
  process.exit(finalReport.health.ok && finalReport.orphanCheck.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(`runtime health report failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
