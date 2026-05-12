#!/usr/bin/env node
/**
 * meta_description eksik bloglar için Ollama ile SEO meta açıklaması üret.
 * Hedef: 140-160 karakter, Türkçe, tıklanabilir.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat as _ollamaChat, SYSTEM_TR } from './ollama-lib.mjs';
const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const ollamaCfg = getOllamaConfig();
const MODEL = ollamaCfg.MODEL;

const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS || '';
const DB_USER  = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME  = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS  = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15482;

const DRY = process.argv.includes('--dry-run');

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (messages) => _ollamaChat(messages, MODEL, ollamaCfg);

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
        .connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n📝 Blog meta_description üretimi başlatılıyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: DB_USER, password: DB_PASS, database: DB_NAME,
  });
  await client.connect();

  const { rows: blogs } = await client.query(`
    SELECT id, title, excerpt, category
    FROM blog_posts
    WHERE status = 'published'
      AND (meta_description IS NULL OR length(meta_description) < 30)
    ORDER BY published_at DESC
  `);

  console.log(`📋 ${blogs.length} blog için meta_description üretilecek\n`);

  let ok = 0, fail = 0;

  for (const blog of blogs) {
    process.stdout.write(`  → ${blog.title.slice(0, 55)} ... `);

    const excerptHint = blog.excerpt ? `Kısa özet: ${blog.excerpt.slice(0, 150)}` : '';
    const catHint = blog.category ? `Kategori: ${blog.category}.` : '';

    const prompt = `Blog yazısı için SEO meta açıklaması yaz.
Başlık: "${blog.title}"
${catHint} ${excerptHint}

Kural: Tam olarak 140-160 karakter arası, Türkçe, merak uyandıran, "Şanlıurfa" kelimesini içermeli (uygunsa).
Sadece meta açıklaması metnini yaz, başka hiçbir şey ekleme.`;

    try {
      let metaDesc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);
      // Trim to max 160 chars, clean quotes/newlines
      metaDesc = metaDesc.replace(/[\r\n"]/g, ' ').trim().slice(0, 160);

      if (DRY) {
        console.log(`\n    [DRY] (${metaDesc.length} k) ${metaDesc}`);
      } else {
        await client.query(
          'UPDATE blog_posts SET meta_description = $1, seo_description = $2 WHERE id = $3',
          [metaDesc, metaDesc, blog.id]
        );
        console.log(`✓ (${metaDesc.length} k)`);
      }
      ok++;
      await sleep(800);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(500);
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} güncellendi, ${fail} hata${DRY ? ' (DRY RUN)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
