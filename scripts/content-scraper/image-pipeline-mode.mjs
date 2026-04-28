#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function loadEnvFile(name) {
  const envPath = path.join(process.cwd(), name);
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const mode = process.argv[2] || 'auto';
const hasProviderKey = Boolean(
  String(process.env.PEXELS_API_KEY || '').trim() || String(process.env.UNSPLASH_ACCESS_KEY || '').trim(),
);

function run(cmd) {
  console.log(`[images:pipeline:${mode}] ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}

if (mode === 'online' && !hasProviderKey) {
  console.error('Online image pipeline requires PEXELS_API_KEY or UNSPLASH_ACCESS_KEY.');
  process.exit(1);
}

if (mode === 'offline') {
  run('npm run images:map');
  run('npm run images:check-external');
  run('npm run images:validate');
  run('npm run images:quality');
  run('npm run images:moderate');
  process.exit(0);
}

if (mode === 'online' || hasProviderKey) {
  run('npm run images:check-keys');
  run('npm run images:download');
  run('npm run images:map');
  run('npm run images:check-external');
  run('npm run images:validate');
  run('npm run images:quality');
  run('npm run images:moderate');
  process.exit(0);
}

run('npm run images:pipeline:offline');
