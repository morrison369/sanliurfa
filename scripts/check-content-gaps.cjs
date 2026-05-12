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
const PORT=15561;
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
    
    const [placeCoords, eventMonths, blogRecent] = await Promise.all([
      client.query(`SELECT COUNT(*) FILTER(WHERE latitude IS NULL OR longitude IS NULL) AS no_coords, COUNT(*) total FROM app.places WHERE status='active'`),
      client.query(`SELECT TO_CHAR(start_date,'YYYY-MM') AS month, COUNT(*) cnt FROM app.events WHERE status='published' AND start_date >= '2026-01-01' GROUP BY month ORDER BY month`),
      client.query(`SELECT category_slug, COUNT(*) cnt FROM blog_posts WHERE status='published' GROUP BY category_slug ORDER BY cnt DESC`),
    ]);
    
    const c = placeCoords.rows[0];
    console.log(`Mekan koordinat eksik: ${c.no_coords}/${c.total}`);
    
    console.log('\nEtkinlik aylık dağılım (2026):');
    eventMonths.rows.forEach(r => console.log(`  ${r.month}: ${r.cnt}`));
    
    console.log('\nBlog kategori dağılımı:');
    blogRecent.rows.forEach(r => console.log(`  ${r.category_slug || 'null'}: ${r.cnt}`));
    
    await client.end(); server.close(); ssh.end();
  }).connect({host:process.env.SSH_HOST,port:parseInt(process.env.SSH_PORT||'77'),username:process.env.SSH_USER,password:process.env.SSH_PASS});
});
ssh.on('error',e=>{console.error(e.message);process.exit(1);});
