import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { runtimeDefaults } from '../config/runtime-defaults.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function checkTcpPort(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function readDotEnvValue(key) {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const content = fs.readFileSync(envPath, 'utf8');
  const line = content
    .split(/\r?\n/)
    .find((row) => row.trim().startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(line.indexOf('=') + 1).trim();
}

function resolveDbTarget() {
  const connectionString = process.env.DATABASE_URL || readDotEnvValue('DATABASE_URL');
  if (connectionString) {
    try {
      const parsed = new URL(connectionString);
      const host = parsed.hostname || '127.0.0.1';
      const port = Number(parsed.port || runtimeDefaults.dbPort);
      return { host, port, source: 'DATABASE_URL' };
    } catch {
      // Fallback to DB_HOST / DB_PORT below.
    }
  }

  const host = process.env.DB_HOST || readDotEnvValue('DB_HOST') || runtimeDefaults.host;
  const port = Number(process.env.DB_PORT || readDotEnvValue('DB_PORT') || runtimeDefaults.dbPort);
  return { host, port, source: 'DB_HOST/DB_PORT' };
}

async function checkPostgresHandshake(connectionString) {
  const { Client } = pg;
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 2000,
    statement_timeout: 2000,
    query_timeout: 2000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

function runPlaywrightListProbe() {
  return new Promise((resolve) => {
    const playwrightCliPath = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');
    const child = spawn(process.execPath, [playwrightCliPath, 'test', '--config=playwright.config.ts', '--list'], {
      cwd: projectRoot,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function main() {
  const dbConnectionString = process.env.DATABASE_URL || readDotEnvValue('DATABASE_URL');
  const dbTarget = resolveDbTarget();
  const hostCandidates = dbTarget.host === 'localhost'
    ? ['127.0.0.1', '::1']
    : [dbTarget.host];

  let dbOk = false;
  for (const host of hostCandidates) {
    // eslint-disable-next-line no-await-in-loop
    dbOk = await checkTcpPort(host, dbTarget.port);
    if (dbOk) break;
  }

  if (!dbOk) {
    console.error(`[e2e-preflight] PostgreSQL ulasilamiyor: ${dbTarget.host}:${dbTarget.port} (kaynak: ${dbTarget.source})`);
    console.error('[e2e-preflight] E2E icin once DB servisini baslatin.');
    process.exit(1);
  }

  if (!dbConnectionString) {
    console.error('[e2e-preflight] DATABASE_URL bulunamadi. .env veya ortam degiskenlerini kontrol edin.');
    process.exit(1);
  }

  const handshake = await checkPostgresHandshake(dbConnectionString);
  if (!handshake.ok) {
    console.error('[e2e-preflight] PostgreSQL handshake basarisiz (SELECT 1).');
    console.error(`[e2e-preflight] Detay: ${handshake.message}`);
    process.exit(1);
  }

  const probe = await runPlaywrightListProbe();
  const combined = `${probe.stdout}\n${probe.stderr}`;
  if (
    probe.code !== 0
    && combined.includes('Playwright Test did not expect test.describe() to be called here')
  ) {
    console.error('[e2e-preflight] Playwright runner context hatasi algilandi.');
    console.error('[e2e-preflight] Test dosyalari suite context disinda degerlendiriliyor.');
    console.error('[e2e-preflight] Once bu toolchain/runtime problemi cozulmeden E2E kosusu baslatilamaz.');
    process.exit(1);
  }

  if (probe.code !== 0) {
    console.error('[e2e-preflight] Playwright probe basarisiz oldu.');
    console.error(combined.trim());
    process.exit(1);
  }

  const seed = process.env.E2E_SEED || readDotEnvValue('E2E_SEED') || '20260418';
  console.log(`[e2e-preflight] Deterministic seed: ${seed}`);
  console.log('[e2e-preflight] Preflight basarili.');
}

main().catch((error) => {
  console.error('[e2e-preflight] Beklenmeyen hata:', error instanceof Error ? error.message : error);
  process.exit(1);
});
