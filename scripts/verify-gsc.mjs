#!/usr/bin/env node
/**
 * GSC Domain Verification Script
 * Uploads HTML verification file to production server via SSH + calls Site Verification API.
 * Run AFTER setup-ga4-gsc.mjs has saved .gsc-verify-token file.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const SITE_URL = 'https://sanliurfa.com';

async function getAccessToken() {
  const adcPath = path.join(process.env.APPDATA || process.env.HOME, 'gcloud', 'application_default_credentials.json');
  const adc = JSON.parse(fs.readFileSync(adcPath, 'utf8'));
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: adc.client_id, client_secret: adc.client_secret,
      refresh_token: adc.refresh_token, grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

function sshUploadFile(content, remotePath) {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    ssh.on('ready', () => {
      ssh.sftp((err, sftp) => {
        if (err) { ssh.end(); return reject(err); }
        const stream = sftp.createWriteStream(remotePath);
        stream.write(content);
        stream.end();
        stream.on('close', () => { ssh.end(); resolve(); });
        stream.on('error', err => { ssh.end(); reject(err); });
      });
    })
    .on('error', reject)
    .connect({
      host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'),
      username: process.env.SSH_USER, password: process.env.SSH_PASS,
    });
  });
}

async function main() {
  const tokenFile = path.join(scriptDir, '.gsc-verify-token');
  if (!fs.existsSync(tokenFile)) {
    console.error('✗ .gsc-verify-token dosyası bulunamadı. Önce setup-ga4-gsc.mjs çalıştırın.');
    process.exit(1);
  }

  const verifyToken = fs.readFileSync(tokenFile, 'utf8').trim();
  console.log(`\n🔍 GSC doğrulama başlıyor... Token: ${verifyToken}`);

  // Google's verification file content
  const fileContent = `google-site-verification: ${verifyToken}.html`;
  const fileName = `${verifyToken}.html`;

  // Upload to server's public directory
  const remotePath = `/home/sanliur/public_html/${fileName}`;
  console.log(`\n📤 Doğrulama dosyası yükleniyor: ${remotePath}`);

  try {
    await sshUploadFile(fileContent, remotePath);
    console.log('  ✓ Dosya yüklendi');

    // Verify the file is accessible
    await new Promise(r => setTimeout(r, 2000));
    const checkResp = await fetch(`${SITE_URL}/${fileName}`);
    if (checkResp.ok) {
      console.log(`  ✓ Dosya erişilebilir: ${SITE_URL}/${fileName}`);
    } else {
      console.log(`  ⚠️  HTTP ${checkResp.status} — dosya erişilemiyor, birkaç saniye bekleyin`);
    }
  } catch (e) {
    console.error('  ✗ SFTP yükleme hatası:', e.message);
    process.exit(1);
  }

  // Call Site Verification API to verify
  console.log('\n🔐 Google site doğrulaması yapılıyor...');
  const token = await getAccessToken();

  const verifyResp = await fetch('https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=FILE', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      site: { type: 'SITE', identifier: SITE_URL + '/' },
    }),
  });

  if (verifyResp.ok) {
    const result = await verifyResp.json();
    console.log(`  ✓ Site doğrulandı: ${result.site?.identifier || SITE_URL}`);
    fs.unlinkSync(tokenFile);
    console.log('\n✅ GSC doğrulaması tamamlandı!');
    console.log('   search.google.com/search-console adresinde sitenizi görebilirsiniz.');
  } else {
    const err = await verifyResp.text();
    console.error('  ✗ Doğrulama başarısız:', err.slice(0, 300));
    console.log(`\n  💡 Manuel doğrulama için: https://search.google.com/search-console/ownership?siteUrl=${encodeURIComponent(SITE_URL)}/`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
