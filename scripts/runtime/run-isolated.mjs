#!/usr/bin/env node
import { mkdirSync, openSync, closeSync, unlinkSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const runtimeRoot = join(root, '.project-runtime');
const dirs = {
  root: runtimeRoot,
  tmp: join(runtimeRoot, 'tmp'),
  npmCache: join(runtimeRoot, 'npm-cache'),
  home: join(runtimeRoot, 'home'),
  pm2: join(runtimeRoot, 'pm2'),
  logs: join(runtimeRoot, 'logs'),
  run: join(runtimeRoot, 'run'),
};

for (const dir of Object.values(dirs)) mkdirSync(dir, { recursive: true });

const defaultCmd = ['npm', 'run', 'dev'];
const incoming = process.argv.slice(2);
const cmd = incoming.length > 0 ? incoming : defaultCmd;
const lockName = process.env.ISOLATED_LOCK_NAME || 'task';
const lockPath = join(dirs.run, `${lockName}.lock`);
const lockDisabled = process.env.ISOLATED_NO_LOCK === '1';
let lockFd = -1;

if (!lockDisabled) {
  try {
    lockFd = openSync(lockPath, 'wx');
    writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}\n`);
  } catch {
    console.error(`isolated runtime already running (${lockName}): ${lockPath}`);
    process.exit(1);
  }
}

const env = {
  ...process.env,
  PROJECT_ISOLATED: '1',
  PORT: process.env.PORT || '4321',
  APP_PORT: process.env.APP_PORT || '4321',
  PREVIEW_PORT: process.env.PREVIEW_PORT || '4322',
  DB_PORT: process.env.DB_PORT || '5432',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  npm_config_cache: dirs.npmCache,
  NPM_CONFIG_CACHE: dirs.npmCache,
  TMP: dirs.tmp,
  TEMP: dirs.tmp,
  TMPDIR: dirs.tmp,
  PM2_HOME: dirs.pm2,
  HOME: process.env.HOME || dirs.home,
  USERPROFILE: process.env.USERPROFILE || dirs.home,
  COMPOSE_PROJECT_NAME: process.env.COMPOSE_PROJECT_NAME || 'sanliurfa_isolated',
  PLAYWRIGHT_BROWSERS_PATH:
    process.env.PLAYWRIGHT_BROWSERS_PATH || join(runtimeRoot, 'playwright-browsers'),
  ASTRO_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1536',
  CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || '1',
  JWT_SECRET:
    process.env.JWT_SECRET || 'local-dev-jwt-secret-change-before-production-32chars',
};

const child = spawn(cmd[0], cmd.slice(1), {
  stdio: 'inherit',
  shell: true,
  env,
  cwd: root,
});

function cleanup() {
  if (lockDisabled) return;
  try {
    if (lockFd !== -1) closeSync(lockFd);
  } catch {}
  try {
    if (existsSync(lockPath)) unlinkSync(lockPath);
  } catch {}
}

child.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 0);
});

child.on('error', () => {
  cleanup();
  process.exit(1);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});
process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
