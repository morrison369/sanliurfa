import { spawn } from 'node:child_process';

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:1111';
const STARTUP_TIMEOUT_MS = 90_000;

function startServer() {
  const command =
    process.platform === 'win32'
      ? 'npx.cmd astro dev --port 1111 --host 127.0.0.1'
      : 'npx astro dev --port 1111 --host 127.0.0.1';
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
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Smoke server did not become ready within ${STARTUP_TIMEOUT_MS}ms (${url})`);
}

async function assertPath(path: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (response.status >= 500) {
    throw new Error(`Smoke path failed: ${path} -> ${response.status}`);
  }
  console.log(`smoke-ok ${path} -> ${response.status}`);
}

async function main(): Promise<void> {
  const child = startServer();
  let failed = false;

  try {
    await waitForServer(`${BASE_URL}/giris`);
    await assertPath('/giris');
    await assertPath('/kayit');
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
    if (process.platform === 'win32') {
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
