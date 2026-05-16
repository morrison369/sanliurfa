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
import { restartRemotePm2AndCheck } from './lib/remote-pm2.mjs';

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
  const CONCURRENCY = 8; // 8 paralel SFTP put — 100 Mbit hattı doyurur

  // Concurrent batch processing
  let cursor = 0;
  async function worker() {
    while (cursor < files.length) {
      const idx = cursor++;
      const { local, rel } = files[idx];
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
  }
  const startedAt = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

  await sftp.end();
  console.log(`\nSFTP kapatıldı. ${ok} yüklendi (${elapsedSec}s, ${CONCURRENCY}x concurrent), ${fail} hata.`);

  if (fail > 0) {
    console.error('Hatalar var, işlem durduruluyor.');
    process.exit(1);
  }

  if (!doRestart) {
    console.log('\nPM2 restart için: node scripts/prod-sync.mjs --restart');
    return;
  }

  console.log('\nPM2 restart yapılıyor...');
  const { healthOutput } = await restartRemotePm2AndCheck({
    sshConfig,
    remoteDir: REMOTE_DIR,
    pm2Name: PM2_NAME,
    healthMode: 'http-code',
    restartFallback: false,
    settleMs: 8000,
  });
  const code = healthOutput.trim();
  if (code.startsWith('2')) {
    console.log(`\n✓ Health: ${code} — prod AYAKTA`);
  } else {
    console.error(`\n✗ Health: ${code}`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
