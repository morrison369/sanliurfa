#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const forceNonStrict = process.argv.includes('--non-strict');
const strict = !forceNonStrict;

function loadDotEnv(baseEnv = process.env) {
  const nextEnv = { ...baseEnv };
  for (const file of ['.env', '.env.local']) {
    const fullPath = join(process.cwd(), file);
    if (!existsSync(fullPath)) continue;
    for (const rawLine of readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const index = line.indexOf('=');
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && !nextEnv[key]) nextEnv[key] = value;
    }
  }
  return nextEnv;
}

function buildIsolatedRedisEnv(baseEnv = process.env) {
  const loadedEnv = loadDotEnv(baseEnv);
  const currentRedisUrl = loadedEnv.REDIS_URL || '';
  if (currentRedisUrl && !currentRedisUrl.includes(':6379')) {
    const url = new URL(currentRedisUrl);
    return {
      ...loadedEnv,
      REDIS_PORT: url.port || loadedEnv.REDIS_PORT || '6381',
      REDIS_URL: url.toString(),
    };
  }

  const redisPassword = loadedEnv.REDIS_PASSWORD || '';
  const redisPort = loadedEnv.REDIS_PORT && loadedEnv.REDIS_PORT !== '6379'
    ? loadedEnv.REDIS_PORT
    : '6381';
  const redisUrl = redisPassword
    ? `redis://:${encodeURIComponent(redisPassword)}@127.0.0.1:${redisPort}`
    : `redis://127.0.0.1:${redisPort}`;

  return {
    ...loadedEnv,
    REDIS_PORT: redisPort,
    REDIS_URL: redisUrl,
  };
}

function run(cmd, env = process.env) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env,
  });
  if (result.status !== 0) {
    throw new Error(`command failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

try {
  const isolatedEnv = buildIsolatedRedisEnv();
  run('npm run -s dev:isolated:ensure', isolatedEnv);
  run('node scripts/smoke/social-place-phase1.mjs', {
    ...isolatedEnv,
    STRICT_PLACE_SUBMIT: strict ? '1' : process.env.STRICT_PLACE_SUBMIT || '0',
  });
} catch (error) {
  console.error(`[social-core-gate] ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
}
