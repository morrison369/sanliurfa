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

const LOCAL_PORT = 15630;

// UUID prefix (8 char) → expanded short_description (80-150c)
const FIXES = {
  '0306f49d': 'Osmanlı döneminden kalma geleneksel çarşıda usta bakırcılar el yapımı bakır eşya üretiyor; tencere, tepsi ve hediyelik ürünler bulunur.',
  '7ed4026e': 'Hz. İbrahim\'in ateşe atıldığında balığa dönüştüğü efsanesiyle kutsal sayılan göl; sazan balıkları dokunulmaz kabul edilir, ziyaretçilerin uğrak yeridir.',
  '421cfd56': 'Said Nursi\'nin vefat ettiği Urfa\'da inşa edilen türbe, Risale-i Nur eserlerini konu alan kütüphanesiyle birlikte önemli bir inanç ve ziyaret merkezidir.',
  '84df4b8c': 'M.Ö. 9600\'e tarihlenen T biçimli dikilitaşları ve hayvan kabartmalarıyla dünyanın en eski tapınak kompleksi; UNESCO Dünya Mirası Geçici Listesi\'ndedir.',
  '36fa1770': 'Birecik Barajı suları altında kalan tarihi köylerin kalıntılarını barındıran Halfeti; yılın belirli dönemlerinde açan siyah gülleri ve tekne turlarıyla ünlüdür.',
  'dc509c14': 'Halilürrahman Camii bahçesinde yer alan bu sakin göl, Balıklıgöl ile kardeş kabul edilir; çevre peyzajı ve huzurlu atmosferiyle ziyaretçilere dinlenme imkânı sunar.',
  '19eefb65': 'Dünyanın ilk üniversitesi Harran Akademisi\'ne ev sahipliği yaptığı ileri sürülen antik kent; konik kümbet evleri, Ulu Camii kalıntıları ve Harran Kalesi ile öne çıkar.',
  '0d8493ea': 'İslam inancına göre Hz. İbrahim\'in dünyaya geldiği mağara, Mevlid-i Halil Camii ile bütünleşik yapısıyla Şanlıurfa\'nın en kutsal ziyaret mekânlarından biridir.',
  '25d4fce0': 'Hz. İbrahim\'in doğum mağarasının hemen yanında yükselen bu camii, peygamber doğum yeri olarak kabul edilen alana bütünleşik kutsal bir ibadet ve ziyaret mekânıdır.',
  'e27abadf': 'Göbeklitepe ve çevre bölgeye ait eserlerin yanı sıra Hitit, Roma ve Bizans dönemlerine ait buluntuları barındıran Türkiye\'nin en büyük arkeoloji müzelerinden biridir.',
  '1fad5dbf': 'Yaklaşık 1800 metrekarelik alanıyla dünyanın en büyük in-situ mozaik koleksiyonuna ev sahipliği yapar; Hellenistik ve Roma dönemine ait Amazon Kraliçeleri mozaiği öne çıkar.',
  '3fa92eac': '12. yüzyılda Zengi hükümdarları tarafından inşa edilen bu büyük avlulu camii, Şanlıurfa\'nın en eski ve en önemli İslami yapılarından biri olup şehrin simgesi sayılır.',
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
  console.log('\n📝 Tarihi yer short_description genişletme (<80c)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  const { rows: sites } = await db.query(
    `SELECT id, name, short_description FROM historical_sites WHERE status = 'published' AND (short_description IS NULL OR length(short_description) < 80) ORDER BY name`
  );
  console.log(`İnce short_desc sayısı: ${sites.length}\n`);

  let updated = 0, skipped = 0;

  for (const site of sites) {
    const prefix = site.id.toString().slice(0, 8);
    const newDesc = FIXES[prefix];
    if (!newDesc) {
      console.log(`  ⚠ ${site.name} — FIXES'ta yok (${prefix})`);
      skipped++;
      continue;
    }
    await db.query(`UPDATE historical_sites SET short_description = $1 WHERE id = $2`, [newDesc, site.id]);
    console.log(`  ✓ ${site.name} (${newDesc.length}c)`);
    updated++;
  }

  const { rows: [stats] } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE short_description IS NULL OR length(short_description) < 80) AS thin
     FROM historical_sites WHERE status = 'published'`
  );

  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${updated} güncellendi | ${skipped} atlandı`);
  console.log(`📊 Kalan ince short_desc (<80c): ${stats.thin}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
