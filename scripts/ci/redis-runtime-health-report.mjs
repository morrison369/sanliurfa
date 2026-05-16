#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from 'redis';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'redis-runtime-health-report.json');
const outMd = path.join(docsDir, 'redis-runtime-health-report.md');

function loadDotEnv() {
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function resolveRedisUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  if (process.env.REDIS_PASSWORD) {
    return `redis://:${encodeURIComponent(process.env.REDIS_PASSWORD)}@127.0.0.1:6381`;
  }
  return 'redis://127.0.0.1:6381';
}

async function pingRedis(url) {
  const client = createClient({
    url,
    socket: {
      connectTimeout: 800,
      reconnectStrategy: false,
    },
  });
  client.on('error', () => {});
  const startedAt = Date.now();
  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 1200)),
    ]);
    const pong = await client.ping();
    await client.quit();
    return { ok: pong === 'PONG', latencyMs: Date.now() - startedAt, detail: pong };
  } catch (error) {
    try {
      await client.disconnect();
    } catch {}
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

loadDotEnv();
const redisUrl = resolveRedisUrl();
const parsed = new URL(redisUrl);
const ping = await pingRedis(redisUrl);
const requireRunning = process.env.REDIS_RUNTIME_HEALTH_REQUIRE === '1';
const localIsolatedRedis =
  ['127.0.0.1', 'localhost'].includes(parsed.hostname) && Number(parsed.port || 6379) === 6381;
const idleAccepted =
  !requireRunning && localIsolatedRedis && !ping.ok && /ECONNREFUSED|connect/i.test(ping.detail);
const status = ping.ok ? 'ok' : idleAccepted ? 'idle' : 'degraded';
const report = {
  generatedAt: new Date().toISOString(),
  status,
  redis: {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    hasPassword: Boolean(parsed.password),
    pingOk: ping.ok,
    latencyMs: ping.latencyMs,
    detail: ping.detail,
  },
  policy: {
    fallbackAllowed: true,
    globalPort6379AllowedForProjectRedis: false,
    releaseBlocker: false,
    idleAccepted,
    requireRunning,
  },
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Redis Runtime Health Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Host: ${report.redis.host}`,
    `- Port: ${report.redis.port}`,
    `- Ping: ${report.redis.pingOk ? 'PONG' : 'FAIL'}`,
    `- Latency: ${report.redis.latencyMs} ms`,
    `- Detail: ${report.redis.detail}`,
    `- Idle accepted: ${report.policy.idleAccepted ? 'yes' : 'no'}`,
    '',
    'Not: Local isolated Redis kapali ve uygulama calismiyorken idle durumu release blocker degildir. Zorunlu ping icin REDIS_RUNTIME_HEALTH_REQUIRE=1 kullanilir.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(`redis-runtime-health-report: ${report.status.toUpperCase()} (${report.redis.detail})`);
