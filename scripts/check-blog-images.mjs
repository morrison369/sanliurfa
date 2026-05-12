#!/usr/bin/env node
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

const LOCAL_TUNNEL_PORT = 15714;

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

  // Get column names for blog_posts
  const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name LIKE '%image%' ORDER BY column_name`);
  console.log('Blog image columns:', cols.rows.map(r => r.column_name).join(', '));

  // Check counts for each image column
  for (const col of cols.rows) {
    const c = await db.query(`SELECT COUNT(*) FROM blog_posts WHERE status='published' AND (${col.column_name} IS NULL OR ${col.column_name} = '')`);
    console.log(`  ${col.column_name}: ${c.rows[0].count} eksik`);
  }

  // Show 10 sample missing
  const missing = await db.query(`SELECT slug, title, category FROM blog_posts WHERE status='published' AND (featured_image IS NULL OR featured_image = '') LIMIT 10`);
  console.log('\nİlk 10 görselsiz blog:');
  for (const r of missing.rows) console.log(`  [${r.category}] ${r.slug} — ${r.title}`);

  await db.end(); server.close(); ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
