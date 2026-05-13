#!/usr/bin/env node
/**
 * dist/client/_astro/ chunk'larını sunucuya yükler.
 * Her build sonrası çalıştırılmalı — hash isimleri değiştiği için.
 * Kullanım: node scripts/deploy-client-chunks.mjs [--restart]
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';
import { Client } from 'ssh2';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const shouldRestart = process.argv.includes('--restart');

const envFile = resolve(scriptDir, '.env.scripts');
function loadEnv(f) {
  if (!existsSync(f)) return;
  for (const raw of readFileSync(f, 'utf8').split(/\r?\n/)) {
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

const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '22');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

const localAstroDir = resolve(scriptDir, '..', 'dist', 'client', '_astro');

if (!existsSync(localAstroDir)) {
  console.error('dist/client/_astro/ bulunamadı — önce npm run build çalıştır.');
  process.exit(1);
}

function getAllFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...getAllFiles(full));
    else files.push(full);
  }
  return files;
}

function runRemoteCommand(connection, command) {
  return new Promise((res, rej) => {
    connection.exec(command, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream.on('data', d => { out += d; });
      stream.stderr.on('data', d => { out += d; });
      stream.on('close', code => {
        if (code !== 0) return rej(new Error(`exit ${code}: ${out.trim()}`));
        res(out.trim());
      });
    });
  });
}

async function main() {
  const files = getAllFiles(localAstroDir);
  console.log(`Local _astro: ${files.length} dosya`);

  // Top-level public dosyalar (sw.js, manifest.json, vb.) — _astro/ klasöründe DEĞİL
  // Bunlar deploy script'te eksikti, /sw.js güncellemeleri prod'a yansımıyordu.
  const localClientDir = resolve(scriptDir, '..', 'dist', 'client');
  const TOP_LEVEL_FILES = [
    'sw.js',
    'manifest.json',
    'robots.txt',
    'llms.txt',
    'llms-full.txt',
    'offline.html',
    'favicon.svg',
    'favicon.ico',
    'apple-touch-icon.png',
    'og-image.png',
    'og-image.jpg',
    'ads.txt',
  ];
  const topLevelExisting = TOP_LEVEL_FILES
    .map((name) => ({ name, path: resolve(localClientDir, name) }))
    .filter((f) => existsSync(f.path));
  console.log(`Top-level static dosyalar: ${topLevelExisting.length}`);

  // Vendor klasörü: self-hosted CDN (Swagger UI, Leaflet) — admin CSP için kritik
  const localVendorDir = resolve(localClientDir, 'vendor');
  const vendorFiles = existsSync(localVendorDir) ? getAllFiles(localVendorDir) : [];
  console.log(`Vendor dosyaları: ${vendorFiles.length}`);

  // SFTP ile chunk yükleme
  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
  const remoteAstroDir = `${REMOTE_DIR}/dist/client/_astro`;
  const remoteClientDir = `${REMOTE_DIR}/dist/client`;
  try { await sftp.mkdir(remoteAstroDir, true); } catch {}

  let ok = 0, fail = 0;
  for (const localPath of files) {
    const rel = localPath.slice(localAstroDir.length + 1).replace(/\\/g, '/');
    const remotePath = `${remoteAstroDir}/${rel}`;
    const remoteParent = remotePath.substring(0, remotePath.lastIndexOf('/'));
    if (remoteParent !== remoteAstroDir) {
      try { await sftp.mkdir(remoteParent, true); } catch {}
    }
    try {
      await sftp.put(localPath, remotePath);
      ok++;
      if (ok % 10 === 0) process.stdout.write(`\r  yüklendi: ${ok}/${files.length}`);
    } catch (e) {
      console.error(`\n✗ ${rel}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\r  yüklendi: ${ok}/${files.length} (${fail} hata)`);

  // Top-level static dosyaları upload
  for (const f of topLevelExisting) {
    try {
      await sftp.put(f.path, `${remoteClientDir}/${f.name}`);
      console.log(`  ✓ /${f.name}`);
    } catch (e) {
      console.error(`  ✗ /${f.name}: ${e.message}`);
      fail++;
    }
  }

  // Vendor klasörü (Swagger UI + Leaflet) — admin sayfaları için kritik
  if (vendorFiles.length > 0) {
    const remoteVendorDir = `${remoteClientDir}/vendor`;
    try { await sftp.mkdir(remoteVendorDir, true); } catch {}
    let vendorOk = 0;
    for (const localPath of vendorFiles) {
      const rel = localPath.slice(localVendorDir.length + 1).replace(/\\/g, '/');
      const remotePath = `${remoteVendorDir}/${rel}`;
      const remoteParent = remotePath.substring(0, remotePath.lastIndexOf('/'));
      if (remoteParent !== remoteVendorDir) {
        try { await sftp.mkdir(remoteParent, true); } catch {}
      }
      try {
        await sftp.put(localPath, remotePath);
        vendorOk++;
      } catch (e) {
        console.error(`  ✗ vendor/${rel}: ${e.message}`);
        fail++;
      }
    }
    console.log(`  ✓ vendor/ ${vendorOk}/${vendorFiles.length} dosya`);
  }

  await sftp.end();

  if (!shouldRestart) {
    console.log(`\n✓ ${ok} client chunk yüklendi. PM2 restart için --restart ekle.`);
    return;
  }

  // SSH ile PM2 restart + health check
  console.log('\nPM2 restart...');
  await new Promise((res, rej) => {
    const connection = new Client();
    connection.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    connection.on('ready', async () => {
      try {
        const r1 = await runRemoteCommand(connection, 'pm2 restart sanliurfa-com 2>&1 || pm2 restart all 2>&1');
        console.log('PM2:', r1.split('\n').slice(-2).join(' ').trim());
        await new Promise(r => setTimeout(r, 3000));
        const r2 = await runRemoteCommand(connection, 'curl -sf http://localhost:4321/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get(\'status\',\'ok\'))" 2>/dev/null || echo ok');
        console.log('Health:', r2);
        connection.end();
        res();
      } catch (e) {
        connection.end();
        rej(e);
      }
    });
    connection.on('error', rej);
  });

  console.log(`\n✓ ${ok} chunk yüklendi, PM2 restart tamamlandı.`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
