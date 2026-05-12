#!/usr/bin/env node
/**
 * Google OAuth Provider Setup Script
 * Inserts Google OAuth credentials into oauth_providers table.
 *
 * Usage: node scripts/setup-google-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * Where to get credentials:
 * 1. Open: https://console.cloud.google.com/apis/credentials?project=sanliurfa-com-2026
 * 2. Create Credentials → OAuth 2.0 Client IDs → Web application
 * 3. Name: "Sanliurfa.com Web"
 * 4. Authorized redirect URIs: https://sanliurfa.com/api/auth/oauth/callback
 * 5. Copy Client ID and Client Secret from the result dialog
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
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

const LOCAL_TUNNEL_PORT = 15734;

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n✗ Kullanım: node scripts/setup-google-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>');
  console.error('\nGoogle Cloud Console\'dan credential oluşturmak için:');
  console.error('1. https://console.cloud.google.com/apis/credentials?project=sanliurfa-com-2026 adresine gidin');
  console.error('2. "+ CREATE CREDENTIALS" → "OAuth 2.0 Client IDs"');
  console.error('3. Application type: "Web application"');
  console.error('4. Name: "Sanliurfa.com Web"');
  console.error('5. Authorized redirect URIs: https://sanliurfa.com/api/auth/oauth/callback');
  console.error('6. "CREATE" butonuna tıklayın');
  console.error('7. Dialog\'dan Client ID ve Client Secret\'ı kopyalayın');
  console.error('\nSonra: node scripts/setup-google-oauth.mjs "YOUR_CLIENT_ID" "YOUR_CLIENT_SECRET"');
  process.exit(1);
}

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_TUNNEL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log('\n🔑 Google OAuth kurulumu başlıyor...');
  console.log(`   Client ID: ${CLIENT_ID.slice(0, 30)}...`);
  console.log(`   Client Secret: ${CLIENT_SECRET.slice(0, 6)}...`);

  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER || 'sanliur_sanliurfa',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'sanliur_sanliurfa',
  });
  await db.connect();

  await db.query(
    `INSERT INTO oauth_providers
       (provider_name, provider_key, client_id, client_secret, auth_url, token_url, userinfo_url, scope, is_enabled)
     VALUES ('Google', 'google', $1, $2,
       'https://accounts.google.com/o/oauth2/v2/auth',
       'https://oauth2.googleapis.com/token',
       'https://www.googleapis.com/oauth2/v3/userinfo',
       'openid email profile',
       true)
     ON CONFLICT (provider_key) DO UPDATE SET
       client_id = $1, client_secret = $2, is_enabled = true, updated_at = NOW()`,
    [CLIENT_ID, CLIENT_SECRET]
  );

  console.log('\n✅ Google OAuth credentials kaydedildi!');
  console.log('   /giris sayfasında "Google ile Giriş" butonu artık çalışacak.');
  console.log('\n   Test için: https://sanliurfa.com/giris?redirect=/admin');

  await db.end(); server.close(); ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
