#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const projectRoot = resolve(process.cwd()).toLowerCase().replaceAll('/', '\\');
const strictPort = process.env.ISOLATED_STRICT_PORT !== '0';
const targetPort = Number(process.env.PORT || '4321');

function runPowerShell(script) {
  return spawnSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf8' },
  );
}

function parseJson(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

if (process.platform !== 'win32') {
  console.log('[isolation-preflight] non-windows platform: skipped');
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
  console.error('[isolation-preflight] failed to read listening processes');
  const stderr = String(ls.stderr || '').trim();
  if (stderr) console.error(stderr);
  process.exit(1);
}

const rows = parseJson(ls.stdout);
const nodeListeners = Array.isArray(rows) ? rows : rows ? [rows] : [];

const ownedByProject = nodeListeners.filter((r) =>
  String(r.commandLine || '').toLowerCase().includes(projectRoot),
);

const foreignOnTargetPort = nodeListeners.filter(
  (r) => Number(r.port) === targetPort && !String(r.commandLine || '').toLowerCase().includes(projectRoot),
);

if (ownedByProject.length > 0) {
  const pids = [...new Set(ownedByProject.map((r) => Number(r.pid)).filter(Boolean))];
  const killCmd = `
  $pids = @(${pids.join(',')});
  foreach($procId in $pids){
    try { Stop-Process -Id $procId -Force -ErrorAction Stop; Write-Output "killed:$procId"; } catch { Write-Output "skip:$procId"; }
  }
  `;
  const kill = runPowerShell(killCmd);
  if (kill.status !== 0) {
    console.error('[isolation-preflight] failed to stop project listeners');
    process.exit(1);
  }
  const output = String(kill.stdout || '').trim();
  if (output) console.log(output);
}

if (foreignOnTargetPort.length > 0 && strictPort) {
  console.error(
    `[isolation-preflight] port ${targetPort} is occupied by another project; refusing to start on alternate port`,
  );
  for (const row of foreignOnTargetPort) {
    console.error(`- pid=${row.pid} port=${row.port} cmd=${String(row.commandLine || '').slice(0, 220)}`);
  }
  process.exit(1);
}

console.log(
  `[isolation-preflight] ok (projectListenersCleared=${ownedByProject.length}, foreignOnPort${targetPort}=${foreignOnTargetPort.length})`,
);
