const net = require('net');
const { Client: SshClient } = require('ssh2');
const pg = require('pg');
const fs = require('fs');

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
loadEnv('scripts/.env.scripts');
loadEnv('.env');

const PORT = 15550;
const ssh = new SshClient();
const server = net.createServer(sock => {
  ssh.forwardOut('127.0.0.1', PORT, '127.0.0.1', 5432, (err, stream) => {
    if (err) { sock.destroy(); return; }
    sock.pipe(stream); stream.pipe(sock);
  });
});
server.listen(PORT, '127.0.0.1', () => {
  ssh.on('ready', async () => {
    const client = new pg.Client({ host:'127.0.0.1', port:PORT, user:process.env.DB_USER, password:process.env.DB_PASS, database:process.env.DB_NAME });
    await client.connect();
    
    const [places, events, blogs, sites, blogcats] = await Promise.all([
      client.query(`SELECT COUNT(*) total, COUNT(*) FILTER(WHERE length(description)<200) thin, COUNT(*) FILTER(WHERE length(description)>=200 AND length(description)<500) orta, COUNT(*) FILTER(WHERE length(description)>=500) iyi FROM app.places WHERE status='active'`),
      client.query(`SELECT COUNT(*) total, COUNT(*) FILTER(WHERE length(description)<400) thin, COUNT(*) FILTER(WHERE length(description)>=400) iyi FROM app.events WHERE status='published'`),
      client.query(`SELECT COUNT(*) total, COUNT(*) FILTER(WHERE tags IS NULL OR tags='{}') no_tags, COUNT(*) FILTER(WHERE meta_title IS NULL) no_mt, COUNT(*) FILTER(WHERE meta_description IS NULL) no_md FROM blog_posts WHERE status='published'`),
      client.query(`SELECT COUNT(*) total, COUNT(*) FILTER(WHERE visiting_hours IS NOT NULL) has_hours, COUNT(*) FILTER(WHERE entrance_fee IS NOT NULL) has_fee FROM app.historical_sites`),
      client.query(`SELECT category_slug, COUNT(*) cnt FROM blog_posts WHERE status='published' GROUP BY category_slug ORDER BY cnt ASC LIMIT 5`),
    ]);
    
    console.log('=== FINAL KALİTE AUDİT ===');
    const p = places.rows[0];
    console.log(`Mekanlar  : ${p.total} toplam | İnce(<200c): ${p.thin} | Orta(200-500c): ${p.orta} | İyi(500c+): ${p.iyi}`);
    const e = events.rows[0];
    console.log(`Etkinlikler: ${e.total} toplam | İnce(<400c): ${e.thin} | İyi(400c+): ${e.iyi}`);
    const b = blogs.rows[0];
    console.log(`Blog      : ${b.total} toplam | Etiketsiz: ${b.no_tags} | meta_title eksik: ${b.no_mt} | meta_desc eksik: ${b.no_md}`);
    const s = sites.rows[0];
    console.log(`Tarihi Yer: ${s.total} toplam | visiting_hours: ${s.has_hours} | entrance_fee: ${s.has_fee}`);
    console.log(`Blog alt kategoriler (en düşük 5):`);
    blogcats.rows.forEach(r => console.log(`  ${r.category_slug}: ${r.cnt}`));
    
    await client.end(); server.close(); ssh.end();
  }).connect({ host:process.env.SSH_HOST, port:parseInt(process.env.SSH_PORT||'77'), username:process.env.SSH_USER, password:process.env.SSH_PASS });
});
ssh.on('error', e => { console.error(e.message); process.exit(1); });
