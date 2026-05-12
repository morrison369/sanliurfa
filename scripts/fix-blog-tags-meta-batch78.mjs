#!/usr/bin/env node
/**
 * Batch 7+8 blogların eksik tags, meta_title, meta_description alanlarını doldurur.
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
const LOCAL_TUNNEL_PORT = 15535;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream);
        stream.pipe(sock);
      });
    });
    server.listen(LOCAL_TUNNEL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
          keepaliveCountMax: 60,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n🏷️  Blog etiket + meta doldurma (27 yazı)...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1',
    port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: blogs } = await client.query(`
    SELECT id, title, category_slug, excerpt
    FROM blog_posts
    WHERE status = 'published'
      AND (tags IS NULL OR tags = '{}' OR array_length(tags, 1) IS NULL)
    ORDER BY id
  `);

  console.log(`📋 ${blogs.length} blog işlenecek\n`);
  let ok = 0, fail = 0;

  for (const blog of blogs) {
    process.stdout.write(`  → ${blog.title.slice(0, 55)}... `);

    try {
      const [tagsRaw, metaTitle, metaDesc] = await Promise.all([
        ollamaChat([
          { role: 'system', content: SYSTEM_TR },
          { role: 'user', content: `"${blog.title}" başlıklı blog için 4-6 Türkçe etiket üret. Sadece virgülle ayrılmış etiketleri yaz, başka hiçbir şey yazma. Örnek: şanlıurfa,tarih,gezi,arkeoloji` },
        ]),
        ollamaChat([
          { role: 'system', content: SYSTEM_TR },
          { role: 'user', content: `"${blog.title}" başlıklı blog için SEO meta title yaz. 50-60 karakter, Şanlıurfa içersin. Sadece başlığı yaz.` },
        ]),
        ollamaChat([
          { role: 'system', content: SYSTEM_TR },
          { role: 'user', content: `"${blog.title}" başlıklı blog için SEO meta description yaz. 140-160 karakter, Şanlıurfa içersin, kullanıcıyı tıklatacak şekilde. Sadece metni yaz.` },
        ]),
      ]);

      // Etiketleri parse et
      const tags = tagsRaw
        .replace(/["\[\]]/g, '')
        .split(/[,\n]/)
        .map(t => t.trim().toLowerCase().replace(/[^a-z0-9ğüşıöçâîûê\s-]/gi, '').trim())
        .filter(t => t.length > 1 && t.length < 50)
        .slice(0, 6);

      const mt = metaTitle.replace(/['"]/g, '').trim().slice(0, 70);
      const md = metaDesc.replace(/['"]/g, '').trim().slice(0, 165);

      await client.query(`
        UPDATE blog_posts
        SET tags = $1, meta_title = $2, meta_description = $3
        WHERE id = $4
      `, [tags, mt, md, blog.id]);

      console.log(`✓ (${tags.length} etiket)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 50)}`);
      fail++;
    }
    await sleep(2000);
  }

  const { rows: [stats] } = await client.query(`
    SELECT COUNT(*) FILTER (WHERE tags IS NULL OR tags='{}') as no_tags,
           COUNT(*) FILTER (WHERE meta_title IS NULL) as no_mt,
           COUNT(*) FILTER (WHERE meta_description IS NULL) as no_md
    FROM blog_posts WHERE status='published'
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} blog güncellendi | ${fail} hata`);
  console.log(`📊 Etiketsiz: ${stats.no_tags} | Meta title eksik: ${stats.no_mt} | Meta desc eksik: ${stats.no_md}`);
}

main().catch(e => { console.error(e); process.exit(1); });
