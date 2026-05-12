#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const forceNonStrict = process.argv.includes('--non-strict');
const strict = !forceNonStrict;

function buildIsolatedRedisEnv(baseEnv = process.env) {
  const redisPassword = baseEnv.REDIS_PASSWORD || '';
  const redisPort = baseEnv.REDIS_PORT && baseEnv.REDIS_PORT !== '6379'
    ? baseEnv.REDIS_PORT
    : '6381';
  const redisUrl = redisPassword
    ? `redis://:${encodeURIComponent(redisPassword)}@127.0.0.1:${redisPort}`
    : `redis://127.0.0.1:${redisPort}`;

  return {
    ...baseEnv,
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
