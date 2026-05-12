const net = require('net');
const { Client: SshClient } = require('ssh2');
const pg = require('pg');
const fs = require('fs');
function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line||line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep<0) continue;
    const k=line.slice(0,sep).trim(), v=line.slice(sep+1).trim().replace(/^['"]|['"]$/g,'');
    if(k&&v&&!process.env[k]) process.env[k]=v;
  }
}
loadEnv('scripts/.env.scripts'); loadEnv('.env');
const PORT=15556;
const ssh=new SshClient();
const server=net.createServer(sock=>{
  ssh.forwardOut('127.0.0.1',PORT,'127.0.0.1',5432,(err,stream)=>{
    if(err){sock.destroy();return;} sock.pipe(stream); stream.pipe(sock);
  });
});
server.listen(PORT,'127.0.0.1',()=>{
  ssh.on('ready',async()=>{
    const client=new pg.Client({host:'127.0.0.1',port:PORT,user:process.env.DB_USER,password:process.env.DB_PASS,database:process.env.DB_NAME});
    await client.connect();
    const r=await client.query(`
      SELECT
        COUNT(*) total,
        COUNT(*) FILTER(WHERE short_description IS NULL OR short_description='') AS empty,
        COUNT(*) FILTER(WHERE length(short_description)<50) AS very_thin,
        COUNT(*) FILTER(WHERE length(short_description)>=50 AND length(short_description)<100) AS thin,
        COUNT(*) FILTER(WHERE length(short_description)>=100 AND length(short_description)<150) AS ok,
        COUNT(*) FILTER(WHERE length(short_description)>=150) AS iyi
      FROM app.places WHERE status='active'
    `);
    const p=r.rows[0];
    console.log('=== SHORT_DESCRIPTION DAĞILIMI ===');
    console.log('Toplam:', p.total);
    console.log('Boş:', p.empty);
    console.log('Çok ince (<50c):', p.very_thin);
    console.log('İnce (50-100c):', p.thin);
    console.log('Orta (100-150c):', p.ok);
    console.log('İyi (150c+):', p.iyi);
    
    // Kontrol et: blog posts için tags dağılımı
    const r2=await client.query(`
      SELECT COUNT(*) total, COUNT(*) FILTER(WHERE featured_image IS NOT NULL AND featured_image != '') has_img,
             COUNT(*) FILTER(WHERE featured_image IS NULL OR featured_image='') no_img
      FROM blog_posts WHERE status='published'
    `);
    const b=r2.rows[0];
    console.log('\n=== BLOG GÖRSEL ===');
    console.log('Toplam:', b.total, '| Görselli:', b.has_img, '| Görselsiz:', b.no_img);
    
    // Etkinlik görsel kontrolü
    const r3=await client.query(`
      SELECT COUNT(*) total, COUNT(*) FILTER(WHERE image_url IS NOT NULL AND image_url!='') has_img FROM app.events WHERE status='published'
    `);
    const e=r3.rows[0];
    console.log('\n=== ETKİNLİK GÖRSEL ===');
    console.log('Toplam:', e.total, '| Görselli:', e.has_img, '| Görselsiz:', parseInt(e.total)-parseInt(e.has_img));
    
    await client.end(); server.close(); ssh.end();
  }).connect({host:process.env.SSH_HOST,port:parseInt(process.env.SSH_PORT||'77'),username:process.env.SSH_USER,password:process.env.SSH_PASS});
});
ssh.on('error',e=>{console.error(e.message);process.exit(1);});
