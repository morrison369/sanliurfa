#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const lockFile = join(root, '.project-runtime', 'run', 'dev.lock');
const pidFile = join(root, '.project-runtime', 'run', 'dev.pid');
const projectRoot = root.toLowerCase().replaceAll('/', '\\');
const targetPort = Number(process.env.DEV_PORT || 4321);

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8').split(/\r?\n/)[0].trim();
  const pid = Number(raw);
  if (!Number.isFinite(pid) || pid <= 0) return null;
  return pid;
}

function getProjectNodeListeners() {
  if (process.platform !== 'win32') return [];
  const port = Number.isFinite(targetPort) && targetPort > 0 ? targetPort : 4321;
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
  Where-Object { $_.LocalPort -eq ${port} } |
  Select-Object -Property LocalPort,OwningProcess;
$rows = @();
foreach($l in $listeners){
  try {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($l.OwningProcess)" -ErrorAction Stop;
    if($p.Name -ieq 'node.exe'){
      $cmd = '';
      if($null -ne $p.CommandLine){ $cmd = [string]$p.CommandLine; }
      $rows += [PSCustomObject]@{
        port = [int]$l.LocalPort;
        pid = [int]$l.OwningProcess;
        commandLine = $cmd;
      }
    }
  } catch {}
}
$rows | Sort-Object port,pid -Unique | ConvertTo-Json -Depth 3 -Compress
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
    return rows.filter((row) =>
      String(row.commandLine || '').toLowerCase().includes(projectRoot),
    );
  } catch {
    return [];
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function collectState() {
  const lockPid = readPid(lockFile);
  const daemonPid = readPid(pidFile);
  const running = [lockPid, daemonPid].filter((pid) => pid && isAlive(pid));
  const listeners = getProjectNodeListeners();
  const listenerPids = [
    ...new Set(
      listeners
        .map((row) => Number(row.pid))
        .filter((pid) => Number.isFinite(pid) && pid > 0),
    ),
  ];
  return { lockPid, daemonPid, running, listeners, listenerPids };
}

let state = collectState();

// Windows'ta listener kapanışı kısa süre gecikebildiği için tek seferlik kontrol
// false-positive üretebiliyor; kısa retry ile stabil sonuç alıyoruz.
if (state.running.length === 0 && state.listenerPids.length > 0) {
  sleep(900);
  state = collectState();
}

// Stop sonrası lock/pid dosyası ve process sinyali kısa süre yarış koşuluna girebiliyor.
// Listener yoksa bir kısa retry daha yapıp false-positive'i azalt.
if (state.running.length > 0 && state.listenerPids.length === 0) {
  sleep(900);
  state = collectState();
}

const hasManagedRuntime =
  state.running.length > 0 &&
  state.listenerPids.length > 0 &&
  state.listeners.every((row) =>
    String(row.commandLine || '').toLowerCase().includes(projectRoot),
  );

if (hasManagedRuntime) {
  const details = state.listeners
    .slice(0, 5)
    .map((row) => `${row.pid}@${row.port}`)
    .join(', ');
  console.log(`dev isolated running cleanly: lock/pid ${state.running.join(', ')} | listener ${details}`);
  process.exit(0);
}

if (state.running.length > 0 || state.listenerPids.length > 0) {
  const parts = [];
  if (state.running.length > 0) parts.push(`lock/pid: ${state.running.join(', ')}`);
  if (state.listenerPids.length > 0) {
    const details = state.listeners
      .slice(0, 5)
      .map((row) => `${row.pid}@${row.port}`)
      .join(', ');
    parts.push(`listeners: ${state.listenerPids.join(', ')} (${details})`);
  }
  console.error(`orphan dev process detected: ${parts.join(' | ')}`);
  process.exit(1);
}

console.log('no orphan dev process detected');
