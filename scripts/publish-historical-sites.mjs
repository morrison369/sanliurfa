#!/usr/bin/env node
/**
 * historical_sites status='active' → 'published' yap ve Gürcütepe ekle.
 */
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
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

const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const LOCAL_TUNNEL_PORT = 15612;

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
        .connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

const GURCUTEPE = {
  name: 'Gürcütepe Arkeoloji Alanı',
  slug: 'gurcutepe-arkeoloji-alani',
  category: 'Arkeoloji',
  period: 'Taş Devri (MÖ 9000–7500)',
  location: 'Şanlıurfa Merkez',
  district: 'Merkez',
  description: `Gürcütepe, Şanlıurfa il merkezine yaklaşık 15 kilometre mesafede yer alan ve Göbeklitepe ile çağdaş olan önemli bir Taş Devri arkeoloji alanıdır. 1990'lı yıllarda gerçekleştirilen kazılar, alanın MÖ 9000–7500 yılları arasına tarihlenen Çanak Çömleksiz Neolitik A (PPNA) ve B (PPNB) dönemlerine ait olduğunu ortaya koymuştur. Gürcütepe'de ortaya çıkarılan yapılar arasında özellikle dikkat çekici olan T şekilli monolitik dikilitaşlar, Göbeklitepe ile bu dönemin bölgesel mimari geleneğinin ortak ürünleri olduğunu kanıtlamaktadır. Alan, Taş Devri insanlarının erken dönem yerleşim ve inanç pratiklerine ilişkin önemli bulgular sunmaktadır. Gürcütepe buluntuları, Şanlıurfa Arkeoloji Müzesi'nde sergilenmekte olup bölgenin insanlık tarihindeki ayrıcalıklı yerine katkıda bulunmaktadır.`,
  short_description: 'MÖ 9000 tarihli Taş Devri arkeoloji alanı; T şekilli dikilitaşlarıyla Göbeklitepe ile aynı kültürel geleneğin temsilcisi.',
  significance: 'Göbeklitepe ile çağdaş Çanak Çömleksiz Neolitik yerleşim; bölgesel Taş Devri kültürünü anlama açısından kritik referans noktası.',
  visitor_info: 'Alan açık ziyarete kapalıdır; buluntular Şanlıurfa Arkeoloji Müzesi\'nde sergilenmektedir.',
  latitude: 37.1342,
  longitude: 38.7821,
  image_url: null,
};

async function main() {
  console.log('\n🏛️  Tarihi yer yayınlama + Gürcütepe ekleme\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER || 'sanliur_sanliurfa',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'sanliur_sanliurfa',
  });
  await db.connect();

  // Mevcut durum
  const { rows: before } = await db.query(
    `SELECT status, COUNT(*) as count FROM historical_sites GROUP BY status ORDER BY status`
  );
  console.log('Önce:', before.map(r => `${r.status}: ${r.count}`).join(', '));

  // active → published
  const { rowCount: updated } = await db.query(
    `UPDATE historical_sites SET status = 'published' WHERE status = 'active'`
  );
  console.log(`✓ ${updated} tarihi yer active→published yapıldı`);

  // Gürcütepe ekle
  const g = GURCUTEPE;
  const { rowCount: inserted } = await db.query(
    `INSERT INTO historical_sites
       (name, slug, category, period, location, district, description,
        short_description, significance, visitor_info, latitude, longitude,
        image_url, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'published', NOW())
     ON CONFLICT (slug) DO NOTHING`,
    [g.name, g.slug, g.category, g.period, g.location, g.district,
     g.description, g.short_description, g.significance, g.visitor_info,
     g.latitude, g.longitude, g.image_url]
  );
  console.log(inserted ? `✓ Gürcütepe eklendi` : `⊘ Gürcütepe zaten mevcut`);

  // Son durum
  const { rows: after } = await db.query(
    `SELECT status, COUNT(*) as count FROM historical_sites GROUP BY status ORDER BY status`
  );
  console.log('Sonra:', after.map(r => `${r.status}: ${r.count}`).join(', '));

  const total = after.reduce((s, r) => s + parseInt(r.count), 0);
  const published = after.find(r => r.status === 'published')?.count || 0;
  console.log(`\n📊 Toplam: ${total} | Published: ${published}`);

  await db.end();
  server.close();
  ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
