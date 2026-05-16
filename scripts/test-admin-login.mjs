#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getAdminCredentials, readRequiredEnv } from './lib/admin-script-auth.mjs';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');
const bcrypt = require('bcryptjs');

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

const LOCAL_TUNNEL_PORT = 15736;
const { email: TEST_EMAIL } = getAdminCredentials();
const TEST_PASSWORD = readRequiredEnv(
  'ADMIN_TEST_PASSWORD',
  'scripts/.env.scripts veya process env içinde ADMIN_TEST_PASSWORD tanımlayın.'
);

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
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  const r = await db.query(`SELECT email, password_hash, role FROM users WHERE email = $1`, [TEST_EMAIL]);
  const user = r.rows[0];

  if (!user) {
    console.log('✗ Admin kullanıcı bulunamadı:', TEST_EMAIL);
    await db.end(); server.close(); ssh.end(); process.exit(1);
  }

  console.log('Kullanıcı:', user.email, '| Rol:', user.role);

  const ok = await bcrypt.compare(TEST_PASSWORD, user.password_hash);
  console.log(`Şifre "${TEST_PASSWORD}":`, ok ? '✓ DOĞRU' : '✗ YANLIŞ');

  if (!ok) {
    console.log('\nHash prefix:', user.password_hash?.slice(0, 20));
    console.log('Hash bcrypt mi?', user.password_hash?.startsWith('$2'));
  }

  await db.end(); server.close(); ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
