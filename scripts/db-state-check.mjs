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

const LOCAL_TUNNEL_PORT = 15712;

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

  const r = await Promise.all([
    db.query(`SELECT COUNT(*) FROM recipes`),
    db.query(`SELECT COUNT(*) FROM recipes WHERE cover_image IS NULL`),
    db.query(`SELECT COUNT(*) FROM recipes WHERE char_length(COALESCE(description,'')) < 300`),
    db.query(`SELECT COUNT(*) FROM recipes WHERE status != 'published'`),
    db.query(`SELECT COUNT(*) FROM historical_sites`),
    db.query(`SELECT COUNT(*) FROM historical_sites WHERE cover_image IS NULL`),
    db.query(`SELECT COUNT(*) FROM historical_sites WHERE char_length(COALESCE(description,'')) < 300`),
    db.query(`SELECT COUNT(*) FROM blog_posts WHERE status = 'published'`),
    db.query(`SELECT COUNT(*) FROM blog_posts WHERE cover_image IS NULL OR cover_image = ''`),
    db.query(`SELECT COUNT(*) FROM events WHERE status = 'published'`),
    db.query(`SELECT COUNT(*) FROM events WHERE image_url IS NULL OR image_url = ''`),
    db.query(`SELECT category, COUNT(*) FROM blog_posts WHERE status='published' GROUP BY category ORDER BY count DESC`),
    db.query(`SELECT difficulty, COUNT(*) FROM recipes GROUP BY difficulty ORDER BY difficulty`),
    db.query(`SELECT slug FROM recipes ORDER BY id DESC LIMIT 20`),
    db.query(`SELECT slug FROM historical_sites ORDER BY id DESC LIMIT 10`),
  ]);

  console.log('\n📚 TARİFLER:', r[0].rows[0].count, 'toplam |', r[1].rows[0].count, 'görselsiz |', r[2].rows[0].count, 'ince |', r[3].rows[0].count, 'yayında değil');
  console.log('🏛️  TARİHİ YER:', r[4].rows[0].count, 'toplam |', r[5].rows[0].count, 'görselsiz |', r[6].rows[0].count, 'ince');
  console.log('📰 BLOG:', r[7].rows[0].count, 'yayında |', r[8].rows[0].count, 'görselsiz');
  console.log('📅 ETKİNLİK:', r[9].rows[0].count, 'yayında |', r[10].rows[0].count, 'görselsiz');
  console.log('\n📂 Blog Kategori:', r[11].rows.map(x => `${x.category}:${x.count}`).join(', '));
  console.log('🍳 Tarif Zorluk:', r[12].rows.map(x => `${x.difficulty}:${x.count}`).join(', '));
  console.log('\n🆕 Son 20 tarif slugları:\n ', r[13].rows.map(x => x.slug).join('\n  '));
  console.log('\n🆕 Son 10 tarihi yer slugları:\n ', r[14].rows.map(x => x.slug).join('\n  '));

  await db.end(); server.close(); ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
