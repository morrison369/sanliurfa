#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const runtimeRoot = join(root, '.project-runtime');
const runDir = join(runtimeRoot, 'run');
const logDir = join(runtimeRoot, 'logs');
const pidFile = join(runDir, 'watchdog.pid');
const outLog = join(logDir, 'watchdog.out.log');
const errLog = join(logDir, 'watchdog.err.log');
const intervalMs = Math.max(3000, Number(process.env.ISOLATED_WATCHDOG_INTERVAL_MS || '10000'));
const scriptPath = fileURLToPath(import.meta.url);

mkdirSync(runDir, { recursive: true });
mkdirSync(logDir, { recursive: true });

const mode = process.argv[2] || 'status';

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getPid() {
  if (!existsSync(pidFile)) return null;
  const raw = readFileSync(pidFile, 'utf8').trim();
  const pid = Number(raw);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function append(path, msg) {
  appendFileSync(path, `[${new Date().toISOString()}] ${msg}\n`);
}

function status() {
  const pid = getPid();
  if (!pid) {
    console.log('dev isolated watchdog: stopped');
    return;
  }
  if (!isAlive(pid)) {
    console.log(`dev isolated watchdog: stale pid (${pid})`);
    return;
  }
  console.log(`dev isolated watchdog: running (pid=${pid})`);
}

function stop() {
  const pid = getPid();
  if (!pid) {
    console.log('dev isolated watchdog: not running');
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {}
  try {
    unlinkSync(pidFile);
  } catch {}
  console.log(`dev isolated watchdog: stopped (pid=${pid})`);
}

function start() {
  const existing = getPid();
  if (existing && isAlive(existing)) {
    console.log(`dev isolated watchdog: already running (pid=${existing})`);
    return;
  }
  if (existsSync(pidFile)) {
    try {
      unlinkSync(pidFile);
    } catch {}
  }

  const child = spawn(
    process.execPath,
    [scriptPath, 'worker'],
    {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        ISOLATED_WATCHDOG_INTERVAL_MS: String(intervalMs),
      },
    }
  );
  child.unref();
  writeFileSync(pidFile, String(child.pid));
  console.log(`dev isolated watchdog: started (pid=${child.pid})`);
}

function runWorker() {
  append(outLog, `worker started interval=${intervalMs}ms pid=${process.pid}`);
  const timer = setInterval(async () => {
    try {
      await new Promise((resolve, reject) => {
        const cmd = spawn(process.platform === 'win32' ? 'cmd.exe' : 'sh',
          process.platform === 'win32'
            ? ['/d', '/s', '/c', 'node scripts/runtime/dev-daemon.mjs ensure']
            : ['-lc', 'node scripts/runtime/dev-daemon.mjs ensure'],
          { cwd: root, stdio: 'pipe', shell: false }
        );
        let out = '';
        let err = '';
        cmd.stdout.on('data', (d) => {
          out += d.toString();
        });
        cmd.stderr.on('data', (d) => {
          err += d.toString();
        });
        cmd.on('close', (code) => {
          if (out.trim()) append(outLog, out.trim());
          if (err.trim()) append(errLog, err.trim());
          if (code === 0) resolve(null);
          else reject(new Error(`ensure exited ${code}`));
        });
      });
    } catch (error) {
      append(errLog, `ensure failed: ${(error && error.message) || error}`);
    }
  }, intervalMs);

  const cleanup = () => {
    clearInterval(timer);
    append(outLog, `worker stopped pid=${process.pid}`);
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

if (mode === 'start') start();
else if (mode === 'stop') stop();
else if (mode === 'worker') runWorker();
else status();
