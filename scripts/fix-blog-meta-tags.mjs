#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pg from 'pg';

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

const LOCAL_PORT = 15628;

// slug → { meta, tags }
const FIXES = {
  'mirra-sanliurfa-nin-aci-kahvesinin-derin-kulturu': {
    meta: "Şanlıurfa'nın geleneksel acı kahvesi Mırra'nın tarihi, hazırlanışı ve kültürel önemi. Misafirperverde sunulan bu özgün içeceğin sırlarını keşfedin.",
    tags: ['mırra', 'kahve', 'gastronomi', 'gelenekler', 'şanlıurfa-kültürü'],
  },
  'ramazan-sofrasi-sanliurfa-da-i-ftar-gelenekleri-ve-ozel-yemekler': {
    meta: "Şanlıurfa'da Ramazan iftar gelenekleri: kebap, çiğ köfte, pide ve özel tatlılarla dolu bereketli sofraların adresleri ve kültürel anlamı.",
    tags: ['ramazan', 'iftar', 'gastronomi', 'gelenekler', 'şanlıurfa-mutfağı'],
  },
  'sanliurfa-baharat-pazari-i-sot-sumak-ve-yoresel-baharatlar-rehberi': {
    meta: "Şanlıurfa'nın renkli baharat pazarında isot, sumak ve yöresel baharatların dünyası. Alışveriş rehberi ve yerel lezzetlerin vazgeçilmez malzemeleri.",
    tags: ['baharat', 'isot', 'sumak', 'pazar', 'alışveriş', 'gastronomi'],
  },
  'sanliurfa-borek-kulturu-su-boregi-el-acmasi-ve-urfa-usulu-borekler': {
    meta: "Su böreği, el açması ve Urfa usulü yöresel böreklerin tarifleri, fırın adresleri ve Şanlıurfa börek kültürünün incelikleri.",
    tags: ['börek', 'su böreği', 'yöresel lezzetler', 'gastronomi', 'şanlıurfa-mutfağı'],
  },
  'sanliurfa-da-baklava-ve-serbet-dunyasi-tatli-kulturune-yolculuk': {
    meta: "Şanlıurfa'da baklava, kadayıf ve şerbet kültürü: en iyi tatlıcı adresleri, geleneksel tarifler ve tatlı kültürünün şehir hayatındaki yeri.",
    tags: ['baklava', 'tatlı', 'şerbet', 'gastronomi', 'şanlıurfa-mutfağı'],
  },
  'sanliurfa-da-sarap-uzumu-ve-bag-kulturu-harran-ovasinin-meyvesi': {
    meta: "Harran Ovası'nın verimli topraklarında yetişen üzüm çeşitleri, bağ kültürü ve Şanlıurfa'nın geleneksel üzüm işleme yöntemleri.",
    tags: ['üzüm', 'bağ', 'harran', 'tarım', 'gastronomi', 'şanlıurfa-kültürü'],
  },
  'sanliurfa-pazar-yerleri-taze-sebze-meyve-ve-yerel-uretim-rehberi': {
    meta: "Şanlıurfa'nın canlı pazar yerlerinde taze sebze, meyve ve yöresel ürünler. Kapalı Çarşı'dan Bostancı Pazarı'na alışveriş rehberi.",
    tags: ['pazar', 'alışveriş', 'taze sebze', 'yöresel ürünler', 'şanlıurfa'],
  },
  'sanliurfa-sabahlari-tereyagli-pide-kaymak-ve-geleneksel-sofra': {
    meta: "Tereyağlı pide, kaymak ve geleneksel kahvaltı lezzetleriyle Şanlıurfa sabahları. En iyi kahvaltı mekânları ve yöresel sabah sofrasının sırları.",
    tags: ['kahvaltı', 'pide', 'kaymak', 'gastronomi', 'şanlıurfa-mutfağı'],
  },
  'urfa-da-durum-ve-sandvic-kulturu-hizli-ama-lezzetli-sokak-yemekleri': {
    meta: "Urfa usulü dürüm ve sandviçin kendine özgü lezzet sırları: isot, sumak ve el yapımı lavaş ile şekillenen sokak lezzetleri rehberi.",
    tags: ['dürüm', 'sandviç', 'sokak lezzeti', 'isot', 'gastronomi', 'şanlıurfa-mutfağı'],
  },
  'urfa-nin-peynir-ve-sut-urunleri-kulturu-tereyagi-yogurt-ve-lor': {
    meta: "Şanlıurfa'nın geleneksel peynir, tereyağı ve süt ürünleri kültürü: yöresel üreticiler, pazarlar ve ev yapımı lezzetlerin adresleri.",
    tags: ['peynir', 'tereyağı', 'süt ürünleri', 'yöresel', 'gastronomi'],
  },
  'urfa-pide-kulturu-firin-pideleri-etli-ekmek-ve-en-i-yi-pideciler': {
    meta: "Fırın pideleri, etli ekmek ve Urfa pidesinin ayrıntılı rehberi: en iyi pide fırınları, malzemeler ve geleneksel pişirme yöntemleri.",
    tags: ['pide', 'etli ekmek', 'fırın', 'gastronomi', 'şanlıurfa-mutfağı'],
  },
  'urfa-sillik-tatlisi-tarihi-tarifi-ve-en-i-yi-tatlicilar': {
    meta: "Urfa'ya özgü Şıllık tatlısının tarihi, tarifi ve en iyi tatlandığı adresler. Tahinle hazırlanan bu nefis yöresel tatlının hikayesi.",
    tags: ['şıllık', 'tatlı', 'urfa tatlıları', 'gastronomi', 'şanlıurfa-mutfağı'],
  },
  'urfa-tatli-kulturu-kunefe-den-katmer-e-tum-tatlilar': {
    meta: "Künefeden katmere, baklava ve şıllığa kadar Urfa tatlı kültürünün kapsamlı rehberi. En iyi tatlıcı adresleri ve yöresel tariflerin sırları.",
    tags: ['tatlı', 'künefe', 'katmer', 'gastronomi', 'şanlıurfa-mutfağı'],
  },
};

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log('\n📝 Blog meta_description + tags fix...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  // slug bazlı olmayabilir, ID prefix ile çalışalım
  const { rows: posts } = await db.query(
    `SELECT id, slug, title FROM blog_posts WHERE status = 'published' AND (meta_description IS NULL OR meta_description = '' OR tags IS NULL OR cardinality(tags) = 0) ORDER BY title`
  );
  console.log(`Eksik blog yazısı: ${posts.length}\n`);

  let updated = 0, skipped = 0;

  for (const post of posts) {
    // Slug normalize: lowercase, Türkçe karakterleri koru veya sil
    const slug = post.slug;
    const fix = FIXES[slug];

    if (!fix) {
      // Slug eşleşmezse title'dan tahmin et
      console.log(`  ⚠ ${post.title.slice(0, 60)} — FIXES'ta yok (slug: ${slug})`);
      skipped++;
      continue;
    }

    await db.query(
      `UPDATE blog_posts SET meta_description = $1, tags = $2 WHERE id = $3`,
      [fix.meta, fix.tags, post.id]
    );
    console.log(`  ✓ ${post.title.slice(0, 55)}`);
    updated++;
  }

  const { rows: [stats] } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE meta_description IS NULL OR meta_description = '') AS no_meta,
            COUNT(*) FILTER (WHERE tags IS NULL OR cardinality(tags) = 0) AS no_tags
     FROM blog_posts WHERE status = 'published'`
  );

  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${updated} güncellendi | ${skipped} atlandı`);
  console.log(`📊 Kalan meta_desc yok: ${stats.no_meta} | tags yok: ${stats.no_tags}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
