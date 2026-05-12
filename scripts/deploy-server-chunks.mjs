#!/usr/bin/env node
/**
 * dist/server/ altındaki tüm dosyaları SFTP ile prod'a yükler.
 * PM2 crash loop sonrası tam chunk senkronizasyonu için kullanılır.
 * Kullanım: node scripts/deploy-server-chunks.mjs [--restart]
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';
import { Client } from 'ssh2';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const envFile = resolve(scriptDir, '.env.scripts');

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const raw of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(envFile);

const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';
const PM2_NAME = process.env.PM2_NAME || 'sanliurfa-app';
const doRestart = process.argv.includes('--restart');

if (!SSH_PASS) { console.error('SSH_PASS gerekli (scripts/.env.scripts)'); process.exit(1); }

function walkDir(dir, base) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkDir(full, base));
    } else {
      results.push({ local: full, rel: relative(base, full).replace(/\\/g, '/') });
    }
  }
  return results;
}

function runRemoteCommand(connection, command) {
  return new Promise((resolve, reject) => {
    connection.exec(command, (error, stream) => {
      if (error) { reject(error); return; }
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => { resolve({ code, stdout, stderr }); });
      stream.on('data', (chunk) => { const t = chunk.toString(); stdout += t; process.stdout.write(t); });
      stream.stderr.on('data', (chunk) => { const t = chunk.toString(); stderr += t; process.stderr.write(t); });
    });
  });
}

async function main() {
  const localServerDir = resolve(projectRoot, 'dist/server');
  if (!existsSync(localServerDir)) {
    console.error('dist/server bulunamadı. Önce npm run build çalıştırın.');
    process.exit(1);
  }

  const files = walkDir(localServerDir, localServerDir);
  console.log(`${files.length} dosya yüklenecek → ${REMOTE_DIR}/dist/server/`);

  const sshConfig = { host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS, readyTimeout: 30000 };

  const sftp = new SftpClient();
  await sftp.connect(sshConfig);
  console.log('SFTP bağlandı');

  // Önce dizin yapısını oluştur
  const dirs = new Set([`${REMOTE_DIR}/dist/server`]);
  for (const { rel } of files) {
    const parts = rel.split('/');
    parts.pop();
    let acc = `${REMOTE_DIR}/dist/server`;
    for (const p of parts) {
      acc = `${acc}/${p}`;
      dirs.add(acc);
    }
  }
  for (const d of dirs) {
    try { await sftp.mkdir(d, true); } catch {}
  }

  let ok = 0;
  let fail = 0;
  const total = files.length;

  for (const { local, rel } of files) {
    const remotePath = `${REMOTE_DIR}/dist/server/${rel}`;
    try {
      await sftp.put(local, remotePath);
      ok++;
      if (ok % 100 === 0) process.stdout.write(`  ${ok}/${total} yüklendi...\n`);
    } catch (e) {
      console.error(`✗ ${rel}: ${e.message}`);
      fail++;
    }
  }

  await sftp.end();
  console.log(`\nSFTP kapatıldı. ${ok} yüklendi, ${fail} hata.`);

  if (fail > 0) {
    console.error('Hatalar var, işlem durduruluyor.');
    process.exit(1);
  }

  if (!doRestart) {
    console.log('\nPM2 restart için: node scripts/prod-sync.mjs --restart');
    return;
  }

  console.log('\nPM2 restart yapılıyor...');
  const connection = new Client();
  await new Promise((resolve, reject) => connection.on('ready', resolve).on('error', reject).connect(sshConfig));

  const remotePrefix = `cd ${REMOTE_DIR} && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && `;
  const restartResult = await runRemoteCommand(connection, `${remotePrefix}pm2 restart ${PM2_NAME}`);
  if (restartResult.code !== 0) {
    connection.end();
    throw new Error(`PM2 restart başarısız (exit ${restartResult.code})`);
  }

  console.log('8 saniye bekleniyor...');
  await new Promise(r => setTimeout(r, 8000));

  const healthResult = await runRemoteCommand(connection,
    `curl -s --max-time 15 -o /dev/null -w "%{http_code}" http://127.0.0.1:4321/api/health`
  );
  connection.end();

  const code = healthResult.stdout.trim();
  if (code.startsWith('2')) {
    console.log(`\n✓ Health: ${code} — prod AYAKTA`);
  } else {
    console.error(`\n✗ Health: ${code}`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
