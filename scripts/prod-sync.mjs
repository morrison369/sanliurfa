#!/usr/bin/env node

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import SftpClient from 'ssh2-sftp-client';
import { Client } from 'ssh2';

const projectRoot = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(scriptDir, '.env.scripts');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envFile);

function requireEnv(name, fallback = '') {
  const value = (process.env[name] || fallback).trim();
  if (!value) {
    throw new Error(
      `Missing secret: ${name}. Set it in environment or scripts/.env.scripts.`,
    );
  }
  return value;
}

function parseArgs(argv) {
  const options = {
    files: [],
    build: false,
    restart: false,
    smoke: false,
    healthOnly: false,
    install: false,
    deletePaths: [],
    remoteDir: process.env.REMOTE_APP_DIR || '/home/sanliur/public_html',
    appName: process.env.PM2_NAME || 'sanliurfa-app',
    healthUrl: process.env.PROD_HEALTH_URL || 'http://127.0.0.1:4321/api/health',
    smokeUrl: process.env.PROD_SMOKE_URL || 'http://127.0.0.1:4321/harita',
  };

  for (const arg of argv) {
    if (arg === '--build') options.build = true;
    else if (arg === '--install') options.install = true;
    else if (arg === '--restart') options.restart = true;
    else if (arg === '--smoke') options.smoke = true;
    else if (arg === '--health-only') options.healthOnly = true;
    else if (arg.startsWith('--remote-dir=')) options.remoteDir = arg.slice('--remote-dir='.length);
    else if (arg.startsWith('--app-name=')) options.appName = arg.slice('--app-name='.length);
    else if (arg.startsWith('--health-url=')) options.healthUrl = arg.slice('--health-url='.length);
    else if (arg.startsWith('--smoke-url=')) options.smokeUrl = arg.slice('--smoke-url='.length);
    else if (arg.startsWith('--delete=')) options.deletePaths.push(arg.slice('--delete='.length));
    else if (arg.startsWith('--run-sql=')) options.runSql = arg.slice('--run-sql='.length);
    else if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
    else options.files.push(arg);
  }

  return options;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function assertSafeRelativePath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..')) {
    throw new Error(`Unsafe remote relative path: ${relativePath}`);
  }
  return normalized;
}

function toRemotePath(remoteRoot, relativePath) {
  return `${remoteRoot.replace(/\/+$/, '')}/${relativePath.replace(/\\/g, '/')}`;
}

async function ensureRemoteDir(sftp, remoteDir) {
  const normalized = remoteDir.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  let current = normalized.startsWith('/') ? '/' : '';

  for (const part of parts) {
    current = current === '/' ? `/${part}` : `${current}/${part}`;
    try {
      await sftp.stat(current);
    } catch {
      await sftp.mkdir(current);
    }
  }
}

function runRemoteCommand(connection, command) {
  return new Promise((resolve, reject) => {
    connection.exec(command, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      let stdout = '';
      let stderr = '';

      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      stream.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        process.stdout.write(text);
      });
      stream.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        process.stderr.write(text);
      });
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const host = requireEnv('SSH_HOST', '168.119.79.238');
  const port = Number(requireEnv('SSH_PORT', '77'));
  const username = requireEnv('SSH_USER', 'sanliur');
  const password = requireEnv('SSH_PASS');

  if (!options.healthOnly && !options.runSql && options.files.length === 0) {
    throw new Error('No files provided. Example: node scripts/prod-sync.mjs src/pages/harita.astro --build --restart --smoke');
  }

  const sshConfig = {
    host,
    port,
    username,
    password,
    readyTimeout: 20000,
    tryKeyboard: false,
  };

  const sftp = new SftpClient();
  const ssh = new Client();

  await sftp.connect(sshConfig);

  if (!options.healthOnly) {
    for (const file of options.files) {
      const localPath = path.resolve(projectRoot, file);
      if (!fs.existsSync(localPath)) {
        throw new Error(`Local file not found: ${file}`);
      }

      const relativePath = path.relative(projectRoot, localPath);
      const remotePath = toRemotePath(options.remoteDir, relativePath);
      await ensureRemoteDir(sftp, path.posix.dirname(remotePath));
      await sftp.put(localPath, remotePath);
      process.stdout.write(`uploaded ${relativePath}\n`);
    }
  }

  if (options.runSql) {
    const localSql = path.resolve(projectRoot, options.runSql);
    if (!fs.existsSync(localSql)) {
      throw new Error(`SQL file not found: ${options.runSql}`);
    }
    const remoteSqlPath = `/tmp/${path.basename(localSql)}`;
    await sftp.put(localSql, remoteSqlPath);
    process.stdout.write(`uploaded SQL → ${remoteSqlPath}\n`);
    options._runSqlRemote = remoteSqlPath;
  }

  await sftp.end();

  await new Promise((resolve, reject) => {
    ssh.on('ready', resolve).on('error', reject).connect(sshConfig);
  });

  const remotePrefix =
    `cd ${options.remoteDir} && ` +
    `export NVM_DIR="$HOME/.nvm" && ` +
    `[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && `;

  try {
    if (options._runSqlRemote) {
      const dbUser = requireEnv('DB_USER');
      const dbPass = requireEnv('DB_PASS');
      const dbName = requireEnv('DB_NAME');
      const sqlCmd =
        `PGPASSWORD=${shellQuote(dbPass)} psql -U ${shellQuote(dbUser)} ` +
        `-d ${shellQuote(dbName)} -h 127.0.0.1 -v ON_ERROR_STOP=1 ` +
        `-f ${shellQuote(options._runSqlRemote)} && rm -f ${shellQuote(options._runSqlRemote)}`;
      const result = await runRemoteCommand(ssh, sqlCmd);
      if (result.code !== 0) {
        throw new Error(`SQL seed failed with exit code ${result.code}`);
      }
    }

    if (options.deletePaths.length > 0) {
      const targets = options.deletePaths
        .map((file) => toRemotePath(options.remoteDir, assertSafeRelativePath(file)))
        .map(shellQuote)
        .join(' ');
      const result = await runRemoteCommand(ssh, `rm -f -- ${targets}`);
      if (result.code !== 0) {
        throw new Error(`Remote delete failed with exit code ${result.code}`);
      }
    }

    if (options.install) {
      const result = await runRemoteCommand(ssh, `${remotePrefix}npm install`);
      if (result.code !== 0) {
        throw new Error(`Remote npm install failed with exit code ${result.code}`);
      }
    }

    if (options.build) {
      const result = await runRemoteCommand(ssh, `${remotePrefix}npm run build`);
      if (result.code !== 0) {
        throw new Error(`Remote build failed with exit code ${result.code}`);
      }
    }

    if (options.restart) {
      const result = await runRemoteCommand(ssh, `${remotePrefix}pm2 restart ${options.appName}`);
      if (result.code !== 0) {
        throw new Error(`PM2 restart failed with exit code ${result.code}`);
      }
    }

    if (options.smoke || options.healthOnly) {
      const smokeCommand =
        `sleep 6 && ` +
        `echo "---HEALTH---" && ` +
        `health_code=$(curl -s --max-time 15 -o /dev/null -w "%{http_code}" ${options.healthUrl}) && ` +
        `echo "$health_code" && ` +
        `case "$health_code" in 2*) ;; *) echo "health smoke failed: $health_code" >&2; exit 1 ;; esac && ` +
        `echo "---SMOKE---" && ` +
        `smoke_code=$(curl -s --max-time 15 -o /dev/null -w "%{http_code}" ${options.smokeUrl}) && ` +
        `echo "$smoke_code" && ` +
        `case "$smoke_code" in 2*|3*) ;; *) echo "route smoke failed: $smoke_code" >&2; exit 1 ;; esac`;
      const result = await runRemoteCommand(ssh, smokeCommand);
      if (result.code !== 0) {
        throw new Error(`Smoke command failed with exit code ${result.code}`);
      }
    }
  } finally {
    ssh.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
