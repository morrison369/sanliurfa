#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PUBLIC_ROUTE_SMOKE_ROUTES } from './public-route-smoke-routes.mjs';

const repoRoot = resolve(process.cwd());
const repoRootNeedle = repoRoot.toLowerCase().replaceAll('/', '\\');

const args = new Map();
const flags = new Set();
for (const raw of process.argv.slice(2)) {
  if (raw.startsWith('--') && raw.includes('=')) {
    const [key, ...rest] = raw.slice(2).split('=');
    args.set(key, rest.join('='));
  } else if (raw.startsWith('--')) {
    flags.add(raw.slice(2));
  }
}

const mode = args.get('mode') || process.env.SMOKE_MODE || 'local';
const defaultBaseUrl = mode === 'prod' ? 'https://sanliurfa.com' : 'http://127.0.0.1:4321';
const baseUrl = new URL(args.get('base-url') || process.env.SMOKE_BASE_URL || defaultBaseUrl);
const routeSpecs = args.get('routes') || process.env.SMOKE_ROUTES
  ? (args.get('routes') || process.env.SMOKE_ROUTES)
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean)
  .map((route) => ({ path: route, timeoutMs: null }))
  : PUBLIC_ROUTE_SMOKE_ROUTES.map((route) =>
    typeof route === 'string' ? { path: route, timeoutMs: null } : route,
  );
const brandPattern = new RegExp(args.get('brand') || process.env.SMOKE_BRAND_PATTERN || 'Şanlıurfa|sanliurfa\\.com', 'i');
const allowRedirects = flags.has('allow-redirects') || process.env.SMOKE_ALLOW_REDIRECTS !== '0';
const enforceFinalUrl =
  flags.has('strict-final-url') ||
  process.env.SMOKE_STRICT_FINAL_URL === '1' ||
  (mode === 'prod' && process.env.SMOKE_STRICT_FINAL_URL !== '0');
const requireBrand = !flags.has('no-brand') && process.env.SMOKE_REQUIRE_BRAND !== '0';
const timeoutMs = Math.max(1000, Number(args.get('timeout-ms') || process.env.SMOKE_TIMEOUT_MS || '45000'));

function fail(message, details = []) {
  console.error(`[http-route-smoke] ${message}`);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}

function getWindowsPortListeners(port) {
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
$listeners = Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue |
  Select-Object -Property LocalPort,OwningProcess;
$rows = @();
foreach($l in $listeners){
  try {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($l.OwningProcess)" -ErrorAction Stop;
    $cmd = '';
    if($null -ne $p.CommandLine){ $cmd = [string]$p.CommandLine; }
    $rows += [PSCustomObject]@{
      port = [int]$l.LocalPort;
      pid = [int]$l.OwningProcess;
      commandLine = $cmd;
    }
  } catch {}
}
$rows | Sort-Object pid -Unique | ConvertTo-Json -Depth 4 -Compress
`,
    ],
    { encoding: 'utf8' },
  );
  if (ps.status !== 0) return [];
  const text = String(ps.stdout || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function assertLocalListener() {
  const isLoopback =
    ['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname) ||
    baseUrl.hostname.endsWith('.localhost');
  if (mode !== 'local' || !isLoopback) return;

  const port = Number(baseUrl.port || (baseUrl.protocol === 'https:' ? 443 : 80));
  const listeners = getWindowsPortListeners(port);
  if (process.platform !== 'win32') {
    return;
  }
  if (listeners.length === 0) {
    fail(`lokal ${baseUrl.origin} üzerinde dinleyen proses yok`, [
      'Önce npm run dev:isolated:ensure çalışmalı veya SMOKE_BASE_URL doğru porta ayarlanmalı.',
    ]);
  }

  const owned = listeners.filter((row) =>
    String(row.commandLine || '').toLowerCase().includes(repoRootNeedle),
  );
  if (owned.length === 0) {
    fail(`lokal port ${port} bu repo tarafından dinlenmiyor`, listeners.map((row) =>
      `pid=${row.pid} cmd=${String(row.commandLine || '').slice(0, 260)}`,
    ));
  }
}

function routeUrl(route) {
  return new URL(route.startsWith('/') ? route : `/${route}`, baseUrl);
}

async function smokeRoute(routeSpec) {
  const route = routeSpec.path;
  const routeTimeoutMs = Math.max(1000, Number(routeSpec.timeoutMs || timeoutMs));
  const url = routeUrl(route);
  const expectedFinalPath = routeSpec.expectedFinalPath || `${url.pathname}${url.search}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), routeTimeoutMs);
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(url, {
      redirect: allowRedirects ? 'follow' : 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Sanliurfa.com HTTP smoke (+https://sanliurfa.com)',
      },
    });
    const body = await response.text();
    const okStatus = response.status >= 200 && response.status < 400;
    const branded = !requireBrand || brandPattern.test(body) || brandPattern.test(response.url);
    const finalUrl = new URL(response.url);
    const finalPath = `${finalUrl.pathname}${finalUrl.search}`;
    const finalUrlOk = !enforceFinalUrl || routeSpec.allowRedirect === true || finalPath === expectedFinalPath;
    return {
      route,
      url: url.href,
      finalUrl: response.url,
      expectedFinalPath,
      finalPath,
      status: response.status,
      ok: okStatus && branded && finalUrlOk,
      okStatus,
      branded,
      finalUrlOk,
      durationMs: Date.now() - startedAt,
      timeoutMs: routeTimeoutMs,
      sample: body.replace(/\s+/g, ' ').slice(0, 180),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  assertLocalListener();
  if (routeSpecs.length === 0) fail('route listesi boş');

  const results = [];
  for (const routeSpec of routeSpecs) {
    try {
      results.push(await smokeRoute(routeSpec));
    } catch (error) {
      results.push({
        route: routeSpec.path,
        url: routeUrl(routeSpec.path).href,
        finalUrl: '',
        status: 0,
        ok: false,
        okStatus: false,
        branded: false,
        finalUrlOk: false,
        durationMs: Number(routeSpec.timeoutMs || timeoutMs),
        timeoutMs: Number(routeSpec.timeoutMs || timeoutMs),
        sample: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const result of results) {
    const marker = result.ok ? 'ok' : 'fail';
    console.log(
      `${marker} ${result.status} ${result.route} (${result.durationMs}ms/${result.timeoutMs}ms) -> ${result.finalUrl || result.url}`,
    );
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    fail('HTTP route smoke başarısız', failures.map((result) =>
      `${result.route}: status=${result.status}, statusOk=${result.okStatus}, brandOk=${result.branded}, finalUrlOk=${result.finalUrlOk}, final=${result.finalPath || result.finalUrl}, expected=${result.expectedFinalPath || 'n/a'}, sample=${result.sample}`,
    ));
  }

  console.log(`http-route-smoke: ok (${mode}, ${baseUrl.origin}, routes=${routeSpecs.length})`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
