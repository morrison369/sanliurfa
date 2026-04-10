import { spawn } from 'node:child_process';

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:1111';
const STARTUP_TIMEOUT_MS = 90_000;
const PERF_P95_BUDGET_MS = Number.parseInt(process.env.SMOKE_MAX_MS ?? '2000', 10);

async function isServerReady(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function startServer() {
  const command =
    process.platform === 'win32'
      ? 'npx.cmd astro dev --port 1111 --host 127.0.0.1 --strictPort'
      : 'npx astro dev --port 1111 --host 127.0.0.1 --strictPort';
  const env = {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa_test',
    READ_REPLICA_URL: process.env.READ_REPLICA_URL ?? '',
  };

  return spawn(command, {
    env,
    stdio: 'ignore',
    shell: true,
  });
}

async function waitForServer(url: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < STARTUP_TIMEOUT_MS) {
    if (await isServerReady(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Smoke server did not become ready within ${STARTUP_TIMEOUT_MS}ms (${url})`);
}

async function assertPath(path: string): Promise<void> {
  const started = Date.now();
  const response = await fetch(`${BASE_URL}${path}`);
  const durationMs = Date.now() - started;
  if (response.status >= 500) {
    throw new Error(`Smoke path failed: ${path} -> ${response.status}`);
  }
  if (durationMs > PERF_P95_BUDGET_MS) {
    throw new Error(`Smoke performance budget exceeded: ${path} -> ${durationMs}ms (limit=${PERF_P95_BUDGET_MS}ms)`);
  }
  console.log(`smoke-ok ${path} -> ${response.status} (${durationMs}ms)`);
}

async function main(): Promise<void> {
  const readyProbe = `${BASE_URL}/giris`;
  const reuseExistingServer = await isServerReady(readyProbe);
  const child = reuseExistingServer ? null : startServer();
  let failed = false;

  try {
    if (!reuseExistingServer) {
      await waitForServer(readyProbe);
    }
    const canaryPaths = [
      '/',
      '/giris',
      '/kayit',
      '/hakkinda',
      '/robots.txt',
      '/api/version',
      '/api/health',
      '/api/search/suggestions?prefix=ur&type=places&limit=3',
    ];

    for (const path of canaryPaths) {
      await assertPath(path);
    }
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
    if (child && process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
        stdio: 'ignore',
        shell: true,
      });
      await new Promise((resolve) => killer.on('exit', resolve));
    }
    if (failed) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error('e2e-smoke failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
