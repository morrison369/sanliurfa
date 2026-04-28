#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const runtimeRoot = join(root, '.project-runtime');
const runDir = join(runtimeRoot, 'run');
const logDir = join(runtimeRoot, 'logs');
const pidFile = join(runDir, 'dev.pid');
const lockFile = join(runDir, 'dev.lock');
const outLog = join(logDir, 'dev.out.log');
const errLog = join(logDir, 'dev.err.log');
const devPort = Number(process.env.PORT || '4321');
const projectRoot = root.toLowerCase().replaceAll('/', '\\');

mkdirSync(runDir, { recursive: true });
mkdirSync(logDir, { recursive: true });

const mode = process.argv[2] || 'status';
const startTimeoutMs = Math.max(5000, Number(process.env.ISOLATED_START_TIMEOUT_MS || '30000'));
const healthTimeoutMs = Math.max(3000, Number(process.env.ISOLATED_HEALTH_TIMEOUT_MS || '15000'));
const allowUnhealthyStart = process.env.ISOLATED_ALLOW_UNHEALTHY === '1';
const restartOnUnhealthyEnsure = process.env.ISOLATED_ENSURE_RESTART_ON_UNHEALTHY === '1';

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getPid() {
  if (!existsSync(lockFile)) return null;
  const raw = readFileSync(lockFile, 'utf8').split(/\r?\n/)[0].trim();
  const pid = Number(raw);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProjectDevListenerPids() {
  if (process.platform !== 'win32') return [];

  const ps = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq ${devPort} } |
  Select-Object -Property LocalPort,OwningProcess;
$rows = @();
foreach($l in $listeners){
  try {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($l.OwningProcess)" -ErrorAction Stop;
    $cmd = '';
    if($null -ne $p.CommandLine){ $cmd = [string]$p.CommandLine; }
    $rows += [PSCustomObject]@{
      pid = [int]$l.OwningProcess;
      commandLine = $cmd;
    }
  } catch {}
}
$rows | Sort-Object pid -Unique | ConvertTo-Json -Depth 3 -Compress
`,
    ],
    { encoding: 'utf8' },
  );

  if (ps.status !== 0) return [];
  const out = String(ps.stdout || '').trim();
  if (!out) return [];

  try {
    const parsed = JSON.parse(out);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return [
      ...new Set(
        rows
          .filter((row) => {
            const commandLine = String(row.commandLine || '').toLowerCase();
            return (
              commandLine.includes(projectRoot) &&
              commandLine.includes('astro.mjs') &&
              commandLine.includes(' dev ') &&
              commandLine.includes(`--port ${devPort}`)
            );
          })
          .map((row) => Number(row.pid))
          .filter((pid) => Number.isFinite(pid) && pid > 0),
      ),
    ];
  } catch {
    return [];
  }
}

function killPidTree(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    if (process.platform === 'win32') {
      const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
      });
      return result.status === 0;
    }
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

async function waitForRuntimePid(timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const pid = getPid();
    if (pid && isAlive(pid)) return pid;
    await sleep(250);
  }
  return null;
}

async function checkHealthOnce() {
  const res = await fetch(`http://127.0.0.1:${devPort}/api/health`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return res;
}

function evaluateHealth(statusCode, payload) {
  if (statusCode >= 200 && statusCode < 300) {
    return { healthy: true, mode: 'ok' };
  }

  const degradedWithDb =
    statusCode === 503 &&
    payload &&
    payload.status === 'degraded' &&
    payload.services &&
    payload.services.database &&
    payload.services.database.status === 'connected';

  if (degradedWithDb) {
    return { healthy: true, mode: 'degraded-db-only' };
  }

  return { healthy: false, mode: 'down' };
}

async function checkHealthState() {
  const res = await checkHealthOnce();
  let payload = null;
  const raw = await res.text();
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {}
  const evalResult = evaluateHealth(res.status, payload);
  return { status: res.status, payload, raw, ...evalResult };
}

async function waitForHealthy(timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const state = await checkHealthState();
      if (state.healthy) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

async function start() {
  const existing = getPid();
  if (existing && isAlive(existing)) {
    console.log(`dev isolated already running (pid=${existing})`);
    return;
  }
  if (existsSync(lockFile)) {
    try {
      unlinkSync(lockFile);
    } catch {}
  }

  const child = spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'sh',
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'node scripts/runtime/run-isolated.mjs npm run dev:raw']
      : ['-lc', 'node scripts/runtime/run-isolated.mjs npm run dev:raw'],
    {
      cwd: root,
      detached: true,
      stdio: (() => {
        const outFd = openSync(outLog, 'a');
        const errFd = openSync(errLog, 'a');
        // FDs are inherited by the child; safe to close in parent after spawn.
        process.nextTick(() => {
          try {
            closeSync(outFd);
            closeSync(errFd);
          } catch {}
        });
        return ['ignore', outFd, errFd];
      })(),
      env: {
        ...process.env,
        ISOLATED_LOCK_NAME: 'dev',
        E2E_RATE_LIMIT_BYPASS: '1',
      },
    }
  );

  child.unref();
  writeFileSync(pidFile, String(child.pid));
  appendFileSync(outLog, `[${new Date().toISOString()}] start pid=${child.pid}\n`);

  const runtimePid = await waitForRuntimePid(startTimeoutMs);
  if (!runtimePid) {
    console.log(`dev isolated start timeout: runtime pid not detected in ${startTimeoutMs}ms`);
    process.exit(1);
  }
  const healthy = await waitForHealthy(healthTimeoutMs);
  if (!healthy) {
    if (allowUnhealthyStart) {
      console.log(`dev isolated warning: runtime pid=${runtimePid}, health endpoint not ready yet`);
      return;
    }
    console.log(
      `dev isolated start failed: runtime pid=${runtimePid}, health endpoint not ready in ${healthTimeoutMs}ms`
    );
    try {
      process.kill(runtimePid, 'SIGTERM');
      appendFileSync(outLog, `[${new Date().toISOString()}] stop pid=${runtimePid} reason=unhealthy-start\n`);
    } catch {}
    try {
      if (existsSync(lockFile)) unlinkSync(lockFile);
    } catch {}
    try {
      if (existsSync(pidFile)) unlinkSync(pidFile);
    } catch {}
    process.exit(1);
  }
  console.log(`dev isolated started (pid=${runtimePid})`);
}

async function stop() {
  const pid = getPid();
  if (pid) {
    killPidTree(pid);
    appendFileSync(outLog, `[${new Date().toISOString()}] stop pid=${pid}\n`);
  }

  await sleep(600);
  const listenerPids = getProjectDevListenerPids();
  for (const listenerPid of listenerPids) {
    killPidTree(listenerPid);
    appendFileSync(
      outLog,
      `[${new Date().toISOString()}] stop child-listener pid=${listenerPid} port=${devPort}\n`,
    );
  }

  try {
    if (existsSync(lockFile)) unlinkSync(lockFile);
  } catch {}
  try {
    unlinkSync(pidFile);
  } catch {}
  if (pid || listenerPids.length > 0) {
    const suffix = listenerPids.length > 0 ? `, child=${listenerPids.join(',')}` : '';
    console.log(`dev isolated stopped (pid=${pid || 'none'}${suffix})`);
    return;
  }

  console.log('dev isolated is not running');
}

function status() {
  const pid = getPid();
  if (!pid) {
    console.log('dev isolated status: stopped');
    return;
  }
  if (!isAlive(pid)) {
    console.log(`dev isolated status: stale pid (${pid})`);
    return;
  }
  console.log(`dev isolated status: running (pid=${pid})`);
}

function logs() {
  const lines = Math.max(10, Number(process.argv[3] || '80'));
  const showTail = (path, label) => {
    if (!existsSync(path)) {
      console.log(`${label}: <missing>`);
      return;
    }
    const content = readFileSync(path, 'utf8').split(/\r?\n/);
    const tail = content.slice(-lines).join('\n');
    console.log(`\n===== ${label} (last ${lines}) =====\n${tail}\n`);
  };
  showTail(outLog, 'dev.out.log');
  showTail(errLog, 'dev.err.log');
}

async function health() {
  const pid = getPid();
  if (!pid || !isAlive(pid)) {
    console.log('dev isolated health: stopped');
    process.exit(1);
  }
  try {
    const state = await checkHealthState();
    console.log(`dev isolated health: http ${state.status} (${state.mode})`);
    console.log((state.raw || '').slice(0, 400));
    process.exit(state.healthy ? 0 : 1);
  } catch (error) {
    console.log(`dev isolated health: error ${(error && error.message) || error}`);
    process.exit(1);
  }
}

async function restart() {
  await stop();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await start();
}

async function ensure() {
  const pid = getPid();
  if (!pid || !isAlive(pid)) {
    console.log('dev isolated ensure: process not running, starting...');
    await start();
    return;
  }

  const healthy = await waitForHealthy(3000);
  if (healthy) {
    console.log(`dev isolated ensure: healthy (pid=${pid})`);
    return;
  }

  if (!restartOnUnhealthyEnsure) {
    console.log(`dev isolated ensure: unhealthy (pid=${pid}), no auto-restart (safe mode)`);
    process.exit(1);
  }

  console.log(`dev isolated ensure: unhealthy (pid=${pid}), restarting...`);
  await restart();
}

if (mode === 'start') {
  start().catch(() => process.exit(1));
}
else if (mode === 'stop') {
  stop().catch(() => process.exit(1));
}
else if (mode === 'logs') logs();
else if (mode === 'restart') {
  restart().catch(() => process.exit(1));
} else if (mode === 'health') {
  health().catch(() => process.exit(1));
} else if (mode === 'ensure') {
  ensure().catch(() => process.exit(1));
} else status();
