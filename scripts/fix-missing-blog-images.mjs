#!/usr/bin/env node
/**
 * Dosyası eksik blog görsellerini Pexels'ten indir.
 * node scripts/fix-missing-blog-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
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

const PEXELS_KEY = process.env.PEXELS_KEY;
const LOCAL_PORT = 15611;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugToQuery(slug) {
  // slug → arama sorgusu: tire ayır, Türkçe odaklı terimler ekle
  const words = slug.split('-').filter(w => w.length > 2 && !['ile', 've', 'bir', 'da', 'de', 'ta', 'te'].includes(w));
  const base = words.slice(0, 4).join(' ');
  return `${base} sanliurfa turkey`;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'sanliurfa.com/1.0' } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function fetchPexels(query) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.pexels.com',
      path: `/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      headers: { Authorization: PEXELS_KEY },
    };
    https.get(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('JSON parse fail')); }
      });
    }).on('error', reject);
  });
}

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({
          host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER, password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n📸 Eksik blog görsellerini Pexels\'ten indir\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows } = await client.query(`
    SELECT slug, title, featured_image FROM blog_posts
    WHERE status='published' AND featured_image IS NOT NULL
    ORDER BY created_at DESC`);

  // Dosyası eksik olanları bul
  const missing = rows.filter(r => {
    if (!r.featured_image) return false;
    const rel = r.featured_image.replace(/^\//, '');
    return !fs.existsSync(path.join(projectRoot, 'public', rel));
  });

  console.log(`📋 ${missing.length} eksik görsel tespit edildi\n`);

  let ok = 0, fail = 0;
  const fallbackQuery = 'sanliurfa turkey city ancient';

  for (let i = 0; i < missing.length; i++) {
    const item = missing[i];
    const destRel = item.featured_image.replace(/^\//, '');
    const destPath = path.join(projectRoot, 'public', destRel);
    const destDist = path.join(projectRoot, 'dist', 'client', destRel);

    // Path düzelt: /uploads/blog/ → /uploads/blogs/
    let targetPath = destPath;
    let targetDist = destDist;
    let dbPath = item.featured_image;

    if (item.featured_image.startsWith('/uploads/blog/') && !item.featured_image.startsWith('/uploads/blogs/')) {
      // singular blog → blogs (fix DB path too)
      const fixed = item.featured_image.replace('/uploads/blog/', '/uploads/blogs/').replace('.webp', '.jpg');
      dbPath = fixed;
      targetPath = path.join(projectRoot, 'public', fixed.replace(/^\//, ''));
      targetDist = path.join(projectRoot, 'dist', 'client', fixed.replace(/^\//, ''));
    }

    // Zaten var mı kontrol et (fixed path)
    if (fs.existsSync(targetPath)) {
      if (dbPath !== item.featured_image) {
        await client.query(`UPDATE blog_posts SET featured_image=$1 WHERE slug=$2`, [dbPath, item.slug]);
        console.log(`[${i+1}/${missing.length}] PATH FIX: ${item.slug}`);
      } else {
        console.log(`[${i+1}/${missing.length}] SKIP (zaten var): ${item.slug}`);
      }
      ok++;
      continue;
    }

    process.stdout.write(`[${i+1}/${missing.length}] ${item.slug.substring(0, 40)}... `);

    try {
      const query = slugToQuery(item.slug);
      let pexelsData = await fetchPexels(query);
      await sleep(300);

      let photoUrl = pexelsData?.photos?.[0]?.src?.large;
      if (!photoUrl) {
        // fallback
        pexelsData = await fetchPexels(fallbackQuery);
        await sleep(300);
        photoUrl = pexelsData?.photos?.[Math.floor(Math.random() * 3)]?.src?.large;
      }

      if (!photoUrl) throw new Error('Fotoğraf bulunamadı');

      // Dosyayı indir
      const finalPath = targetPath.replace('.webp', '.jpg').replace(/\.[^.]+$/, '.jpg');
      const finalDist = targetDist.replace('.webp', '.jpg').replace(/\.[^.]+$/, '.jpg');
      const finalDb = dbPath.replace('.webp', '.jpg').replace(/\.[^.]+$/, '.jpg');

      await downloadFile(photoUrl, finalPath);
      // dist/client'e kopyala
      fs.mkdirSync(path.dirname(finalDist), { recursive: true });
      fs.copyFileSync(finalPath, finalDist);

      // DB güncelle (path değiştiyse)
      if (finalDb !== item.featured_image) {
        await client.query(`UPDATE blog_posts SET featured_image=$1 WHERE slug=$2`, [finalDb, item.slug]);
      }

      const size = Math.round(fs.statSync(finalPath).size / 1024);
      console.log(`✓ ${size}KB`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 50)}`);
      fail++;
    }

    await sleep(500);
  }

  await client.end(); server.close(); ssh.end();
  console.log(`\n✅ ${ok} görsel indirildi/düzeltildi | ✗ ${fail} başarısız`);
}

main().catch(e => { console.error(e); process.exit(1); });
