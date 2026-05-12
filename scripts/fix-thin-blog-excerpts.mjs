#!/usr/bin/env node
/**
 * Blog post excerpt'i <100 karakter olanlar için content'ten otomatik özet çıkarır.
 * - HTML/Markdown markup'ı temizler
 * - İlk paragraf veya 220-280 karakter arası cümle sınırına kadar kes
 * - Mevcut güvenli içeriği kullanır (Ollama YAOK — feedback: expand not rewrite)
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

const LOCAL_TUNNEL_PORT = 15601;

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    ssh.on('ready', () => {
      server.listen(LOCAL_TUNNEL_PORT, '127.0.0.1', () => resolve({ ssh, server }));
    });
    ssh.on('error', reject);
    ssh.connect({
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT || '77'),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASS,
    });
  });
}

function stripMarkup(s) {
  return s
    .replace(/```[\s\S]*?```/g, ' ')      // fenced code
    .replace(/<[^>]+>/g, ' ')             // HTML tags
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ') // markdown images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links keep text
    .replace(/[#*_~`>]+/g, ' ')            // markdown emphasis chars
    .replace(/\s+/g, ' ')                  // whitespace collapse
    .trim();
}

function buildExcerpt(content, minLen = 180, maxLen = 280) {
  const clean = stripMarkup(content);
  if (clean.length <= maxLen) return clean;
  // Cümle sınırına kadar kes
  const slice = clean.slice(0, maxLen + 40);
  const lastDot = Math.max(slice.lastIndexOf('. ', maxLen), slice.lastIndexOf('? ', maxLen), slice.lastIndexOf('! ', maxLen));
  if (lastDot > minLen) return slice.slice(0, lastDot + 1).trim();
  return clean.slice(0, maxLen).replace(/\s+\S*$/, '').trim() + '…';
}

async function main() {
  const { ssh, server } = await openSshTunnel();
  const pool = new pg.Pool({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  try {
    const { rows } = await pool.query(`
      SELECT id, title, content, excerpt
      FROM blog_posts
      WHERE status = 'published' AND (excerpt IS NULL OR LENGTH(excerpt) < 100)
      ORDER BY published_at DESC
    `);
    console.log(`📋 ${rows.length} blog post için excerpt regenerate\n`);
    let ok = 0, fail = 0;
    for (const r of rows) {
      const newExcerpt = buildExcerpt(r.content || '');
      if (newExcerpt.length < 150) {
        console.log(`  ✗ [${r.title.slice(0,50)}] çok kısa (${newExcerpt.length}c) — skip`);
        fail++; continue;
      }
      await pool.query('UPDATE blog_posts SET excerpt = $1, updated_at = NOW() WHERE id = $2', [newExcerpt, r.id]);
      console.log(`  ✓ [${newExcerpt.length}c] ${r.title.slice(0,50)}`);
      ok++;
    }
    console.log(`\n✅ ${ok} güncellendi, ${fail} skip`);

    const check = await pool.query("SELECT COUNT(*) thin FROM blog_posts WHERE status='published' AND (excerpt IS NULL OR LENGTH(excerpt)<100)");
    console.log(`📊 Kalan ince excerpt (<100c): ${check.rows[0].thin}`);
  } finally {
    await pool.end();
    server.close();
    ssh.end();
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
