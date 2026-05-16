#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { URL } from 'node:url';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';
import process from 'node:process';

const npmConfigDisabled = (name) => {
  const raw = process.env[`npm_config_${name}`];
  return raw === 'false' || raw === '0';
};

const includeE2E =
  !process.argv.includes('--no-e2e') &&
  !npmConfigDisabled('e2e') &&
  process.env.RELEASE_PUBLIC_E2E !== '0';
const includeProd =
  !process.argv.includes('--no-prod') &&
  !npmConfigDisabled('prod') &&
  process.env.RELEASE_PUBLIC_PROD_SMOKE !== '0';
const requestedLocalBaseUrl = process.env.RELEASE_PUBLIC_LOCAL_BASE_URL || 'http://127.0.0.1:4331';
const localServerEntry = resolve(process.cwd(), 'dist/server/entry.mjs');
const localRedisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6381';
const parsedRedisUrl = new URL(localRedisUrl);

let tempServerProcess = null;
let managedRedisStarted = false;
let localBaseUrl = requestedLocalBaseUrl;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mergeRuntimeEnv(extraEnv = {}) {
  const env = {
    ...process.env,
    ...extraEnv,
  };

  if (process.platform === 'win32') {
    const homeDir = env.USERPROFILE || env.HOME || process.cwd();
    env.USERPROFILE = env.USERPROFILE || homeDir;
    env.HOME = env.HOME || homeDir;
    env.APPDATA = env.APPDATA || resolve(homeDir, 'AppData', 'Roaming');
    env.LOCALAPPDATA = env.LOCALAPPDATA || resolve(homeDir, 'AppData', 'Local');
  }

  return env;
}

const releaseLogLevel = process.env.RELEASE_PUBLIC_LOG_LEVEL || 'warn';

function runCommand(cmd, args, extra = {}) {
  return spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: mergeRuntimeEnv(extra.env || {}),
    ...extra,
  });
}

function isLocalRedisHost(hostname) {
  return ['127.0.0.1', 'localhost', '::1'].includes(hostname) || hostname.endsWith('.localhost');
}

function canConnectTcp(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function isReachable(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Cache-Control': 'no-cache',
      },
    });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

async function ensureLocalRedis() {
  const redisHost = parsedRedisUrl.hostname || '127.0.0.1';
  const redisPort = Number(parsedRedisUrl.port || 6379);
  if (!isLocalRedisHost(redisHost) || !Number.isFinite(redisPort) || redisPort <= 0) return;

  const alreadyReachable = await canConnectTcp(redisHost, redisPort);
  if (alreadyReachable) return;

  console.log(`> ensuring isolated redis on ${redisHost}:${redisPort}`);
  const ensure = runCommand('npm', ['run', '-s', 'redis:isolated:ensure']);
  if (ensure.status !== 0) {
    console.error(`[release-public-gate] failed: isolated redis did not start on ${redisHost}:${redisPort}`);
    process.exit(ensure.status || 1);
  }

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await canConnectTcp(redisHost, redisPort)) {
      managedRedisStarted = true;
      return;
    }
    await sleep(250);
  }

  console.error(`[release-public-gate] failed: isolated redis did not become reachable on ${redisHost}:${redisPort}`);
  process.exit(1);
}

function stopManagedRedis() {
  if (!managedRedisStarted) return;
  try {
    runCommand('npm', ['run', '-s', 'redis:isolated:stop']);
  } catch {
    // ignore redis cleanup failures during gate teardown
  }
  managedRedisStarted = false;
}

function stopTempServer() {
  if (!tempServerProcess?.pid) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(tempServerProcess.pid), '/t', '/f'], {
        stdio: 'ignore',
        shell: true,
      });
    } else {
      tempServerProcess.kill('SIGTERM');
    }
  } catch {
    // ignore cleanup failures during gate teardown
  }
  tempServerProcess = null;
}

async function reserveLocalBaseUrl() {
  const requested = new URL(requestedLocalBaseUrl);
  const host = requested.hostname || '127.0.0.1';
  const basePort = Number(requested.port || (requested.protocol === 'https:' ? 443 : 80));
  const explicitPort = 'RELEASE_PUBLIC_LOCAL_BASE_URL' in process.env;
  const candidates = explicitPort
    ? [basePort]
    : [basePort, basePort + 1, basePort + 2, basePort + 3, basePort + 4];

  for (const port of candidates) {
    if (!Number.isFinite(port) || port <= 0) continue;
    if (await canConnectTcp(host, port, 250)) continue;
    const candidateUrl = new URL(requested.origin);
    candidateUrl.protocol = requested.protocol;
    candidateUrl.hostname = host;
    candidateUrl.port = String(port);
    localBaseUrl = candidateUrl.origin;
    return;
  }

  console.error(
    `[release-public-gate] failed: local release port unavailable (${requested.protocol}//${host}:${basePort})`,
  );
  process.exit(1);
}

async function ensureLocalServer() {
  console.log(`> starting local release server on ${localBaseUrl}`);
  const targetUrl = new URL(localBaseUrl);
  tempServerProcess = spawn(process.execPath, [localServerEntry], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: mergeRuntimeEnv({
      HOST: targetUrl.hostname || '127.0.0.1',
      PORT: String(Number(targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80))),
      NODE_ENV: process.env.NODE_ENV || 'production',
      LOG_LEVEL: releaseLogLevel,
    }),
  });

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await isReachable(localBaseUrl)) return;
    if (tempServerProcess.exitCode !== null) break;
    await sleep(500);
  }

  stopTempServer();
  console.error(`[release-public-gate] failed: local server did not become ready at ${localBaseUrl}`);
  process.exit(1);
}

process.on('exit', stopTempServer);
process.on('exit', stopManagedRedis);
process.on('SIGINT', () => {
  stopTempServer();
  stopManagedRedis();
  process.exit(130);
});
process.on('SIGTERM', () => {
  stopTempServer();
  stopManagedRedis();
  process.exit(143);
});

const localCommandEnv = () => ({
  LOG_LEVEL: releaseLogLevel,
  PUBLIC_ROUTE_CACHE_CONTRACT_NOTES: '0',
  ADMIN_SURFACE_VERBOSE: '0',
});

const routedCommandEnv = () => ({
  ...localCommandEnv(),
  SMOKE_BASE_URL: localBaseUrl,
  SMOKE_VERBOSE: '0',
  SITEMAP_ROUTE_BASE_URL: localBaseUrl,
  SITEMAP_ROUTE_VERBOSE: '0',
  SITEMAP_VERBOSE: '0',
  CITY_DATA_BASE_URL: localBaseUrl,
  HOMEPAGE_IMAGE_HTML_BASE_URL: localBaseUrl,
  RESPONSIVE_GATE_BASE_URL: localBaseUrl,
  RESPONSIVE_GATE_VERBOSE: '0',
  HOMEPAGE_PERF_BASE_URL: localBaseUrl,
  HOMEPAGE_PERF_VERBOSE: '0',
  PUBLIC_ROUTE_PERF_BASE_URL: localBaseUrl,
  PUBLIC_ROUTE_PERF_VERBOSE: '0',
  PLAYWRIGHT_BASE_URL: localBaseUrl,
  ASTRO_E2E_BASE_URL: localBaseUrl,
});

const commands = [
  ['npm', ['run', '-s', 'type-check']],
  ['npm', ['run', '-s', 'public:cache:contract:gate']],
  ['npm', ['run', '-s', 'build']],
  ['npm', ['run', '-s', 'frontend:release:ready:gate']],
  ['npm', ['run', '-s', 'smoke:pages:critical']],
  ['npm', ['run', '-s', 'smoke:images:critical']],
  ['npm', ['run', '-s', 'smoke:http:local']],
  ['npm', ['run', '-s', 'sitemap:routes:local']],
  [process.execPath, ['scripts/ci/city-data-freshness-gate.mjs', '--pages']],
];

if (includeProd) {
  commands.push(['npm', ['run', '-s', 'smoke:http:prod']]);
  commands.push(['npm', ['run', '-s', 'sitemap:routes:prod']]);
  commands.push(['npm', ['run', '-s', 'city:data:freshness:prod']]);
  commands.push(['npm', ['run', '-s', 'home:performance:prod']]);
  commands.push(['npm', ['run', '-s', 'public:performance:prod']]);
}

if (includeE2E) {
  commands.push([
    process.execPath,
    [
      './node_modules/@playwright/test/cli.js',
      'test',
      '--config=playwright.config.ts',
      'e2e/homepage.spec.ts',
      '--project=chromium',
      '--reporter=dot',
      '--workers=1',
    ],
    {
      PLAYWRIGHT_DISABLE_WEBSERVER: '1',
      ASTRO_DEV_TOOLBAR: '0',
    },
  ]);
}

for (const [index, [cmd, args, extraEnv]] of commands.entries()) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const result = runCommand(cmd, args, {
    env: {
      ...(index >= 3 ? routedCommandEnv() : localCommandEnv()),
      ...(extraEnv || {}),
    },
  });
  if (result.status !== 0) {
    console.error(`[release-public-gate] failed: ${cmd} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }

  if (index === 2) {
    await ensureLocalRedis();
    await reserveLocalBaseUrl();
    await ensureLocalServer();
  }
}

stopTempServer();
stopManagedRedis();
console.log('release-public-gate: PASS');
