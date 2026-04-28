import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from 'redis';
import { resolveProjectRedisPort, resolveProjectRedisUrl } from './project-redis-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const runtimeDir = path.join(root, '.runtime', 'redis');
const dataDir = path.join(runtimeDir, 'data');
const pidFile = path.join(runtimeDir, 'redis.pid');
const confFile = path.join(runtimeDir, 'redis.conf');
const logFile = path.join(runtimeDir, 'redis.log');
const defaultRedisPort = resolveProjectRedisPort(root);

function loadDotEnv() {
  const envFile = path.join(root, '.env');
  if (!existsSync(envFile)) return;

  const lines = readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function getRedisUrl() {
  return resolveProjectRedisUrl(root);
}

function getRedisTarget() {
  const url = new URL(getRedisUrl());
  return {
    url: url.toString(),
    host: url.hostname || '127.0.0.1',
    port: Number(url.port || defaultRedisPort),
    password: decodeURIComponent(url.password || process.env.REDIS_PASSWORD || ''),
  };
}

function ensureDirs() {
  mkdirSync(dataDir, { recursive: true });
}

function toRedisPath(value) {
  return value.replaceAll(path.sep, '/');
}

function writeConfig() {
  const target = getRedisTarget();
  if (target.port === 6379) {
    throw new Error('Project Redis must not use global port 6379. Use PROJECT_REDIS_PORT/REDIS_PORT with a project-local port such as 6381 or 6382.');
  }

  const lines = [
    `bind ${target.host === 'localhost' ? '127.0.0.1' : target.host}`,
    `port ${target.port}`,
    target.password ? `requirepass ${target.password}` : '',
    `dir ${toRedisPath(dataDir)}`,
    'dbfilename sanliurfa.rdb',
    `logfile ${toRedisPath(logFile)}`,
    'appendonly no',
    'save 900 1',
    'timeout 0',
    'databases 16',
  ].filter(Boolean);

  writeFileSync(confFile, `${lines.join('\n')}\n`);
}

async function ping() {
  const target = getRedisTarget();
  const client = createClient({
    url: target.url,
    socket: {
      connectTimeout: 800,
      reconnectStrategy: false,
    },
  });
  client.on('error', () => {});
  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 1200)),
    ]);
    const result = await client.ping();
    await client.quit();
    return result === 'PONG';
  } catch {
    try {
      await client.disconnect();
    } catch {}
    return false;
  }
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

function commandLineForPid(pid) {
  try {
    const output = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
      ],
      { encoding: 'utf8' },
    ).trim();
    return output;
  } catch {
    return '';
  }
}

function readPid() {
  if (!existsSync(pidFile)) return null;
  const pid = Number(readFileSync(pidFile, 'utf8').trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function removePidFile() {
  if (existsSync(pidFile)) rmSync(pidFile, { force: true });
}

function getProjectRedisListenerPids() {
  const target = getRedisTarget();
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
  Where-Object { $_.LocalPort -eq ${target.port} } |
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
    const normalizedConf = confFile.replaceAll('\\', '\\\\');
    return [
      ...new Set(
        rows
          .filter((row) => {
            const commandLine = String(row.commandLine || '');
            const lowered = commandLine.toLowerCase();
            return (
              (lowered.includes('redis-server') || lowered.includes('redis-server.exe')) &&
              (commandLine.includes(confFile) || commandLine.includes(normalizedConf))
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

function stopPid(pid) {
  const commandLine = commandLineForPid(pid);
  const normalizedConf = confFile.replaceAll('\\', '\\\\');
  if (!commandLine || (!commandLine.includes('redis-server') && !commandLine.includes('redis-server.exe'))) {
    throw new Error(`Refusing to stop pid ${pid}: not a redis-server process.`);
  }
  if (!commandLine.includes(confFile) && !commandLine.includes(normalizedConf)) {
    throw new Error(`Refusing to stop pid ${pid}: not this project's Redis config.`);
  }
  execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
}

async function start() {
  ensureDirs();
  writeConfig();

  if (await ping()) {
    console.log('project redis already running');
    return;
  }

  const target = getRedisTarget();
  if (await isPortOpen(target.port, target.host)) {
    throw new Error(`Port ${target.port} is already open but project Redis did not authenticate. Refusing to reuse it.`);
  }

  const out = openSync(logFile, 'a');
  const child = spawn('redis-server', [confFile], {
    cwd: root,
    detached: true,
    stdio: ['ignore', out, out],
    windowsHide: true,
  });
  child.unref();
  writeFileSync(pidFile, String(child.pid));

  for (let i = 0; i < 30; i += 1) {
    if (await ping()) {
      console.log(`project redis started (pid=${child.pid}, port=${target.port})`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Project Redis did not become ready. See ${logFile}`);
}

async function stop() {
  const pids = [
    ...new Set([readPid(), ...getProjectRedisListenerPids()].filter((pid) => Number.isFinite(pid) && pid > 0)),
  ];
  if (pids.length === 0) {
    removePidFile();
    console.log('project redis status: stopped');
    return;
  }

  for (const pid of pids) {
    stopPid(pid);
  }
  removePidFile();
  console.log(`project redis stopped (pid=${pids.join(',')})`);
}

async function status() {
  const target = getRedisTarget();
  const ok = await ping();
  const pids = [
    ...new Set([readPid(), ...getProjectRedisListenerPids()].filter((pid) => Number.isFinite(pid) && pid > 0)),
  ];
  if (ok && pids.length > 0 && readPid() !== pids[0]) {
    writeFileSync(pidFile, String(pids[0]));
  }
  console.log(`project redis status: ${ok ? 'running' : 'stopped'}${pids.length > 0 ? ` (pid=${pids.join(',')})` : ''} port=${target.port}`);
}

async function main() {
  loadDotEnv();
  const command = process.argv[2] || 'status';
  if (command === 'start' || command === 'ensure') return start();
  if (command === 'stop') return stop();
  if (command === 'status') return status();
  if (command === 'ping' || command === 'health') {
    const ok = await ping();
    console.log(ok ? 'project redis ping: PONG' : 'project redis ping: FAIL');
    process.exit(ok ? 0 : 1);
  }
  throw new Error(`Unknown redis command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
