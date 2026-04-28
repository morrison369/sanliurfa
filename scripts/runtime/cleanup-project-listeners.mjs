#!/usr/bin/env node
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(process.cwd()).toLowerCase().replaceAll('/', '\\');
const onlyPortArg = process.argv.find((arg) => arg.startsWith('--port='));
const onlyPort = onlyPortArg ? Number(onlyPortArg.split('=')[1]) : null;

function runPowerShell(script) {
  return spawnSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf8' },
  );
}

function parseJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

if (process.platform !== 'win32') {
  console.log('[runtime-cleanup] non-windows platform: skipped');
  process.exit(0);
}

const listenersQuery = `
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
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
`;

const ls = runPowerShell(listenersQuery);
if (ls.status !== 0) {
  const stderr = String(ls.stderr || '').trim();
  console.error('[runtime-cleanup] failed to list listeners');
  if (stderr) console.error(stderr);
  process.exit(1);
}

const listeners = parseJson(ls.stdout);
const projectListeners = listeners.filter((row) => {
  const cmd = String(row.commandLine || '').toLowerCase();
  if (!cmd.includes(projectRoot)) return false;
  if (onlyPort && Number(row.port) !== onlyPort) return false;
  return true;
});

if (projectListeners.length === 0) {
  console.log(
    `[runtime-cleanup] no project listeners${onlyPort ? ` on port ${onlyPort}` : ''}`,
  );
  process.exit(0);
}

const pids = [...new Set(projectListeners.map((row) => Number(row.pid)).filter(Boolean))];
const killCmd = `
$pids = @(${pids.join(',')});
foreach($procId in $pids){
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop;
    Write-Output "killed:$procId";
  } catch {
    Write-Output "skip:$procId";
  }
}
`;
const kill = runPowerShell(killCmd);
if (kill.status !== 0) {
  const stderr = String(kill.stderr || '').trim();
  console.error('[runtime-cleanup] failed to stop project listeners');
  if (stderr) console.error(stderr);
  process.exit(1);
}

const lines = String(kill.stdout || '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

for (const line of lines) {
  console.log(`[runtime-cleanup] ${line}`);
}
console.log(
  `[runtime-cleanup] completed (targets=${projectListeners.length}, uniquePids=${pids.length})`,
);
