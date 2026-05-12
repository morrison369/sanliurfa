const net = require('net');
const { Client: SshClient } = require('ssh2');
const pg = require('pg');
const fs = require('fs');
function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep<0) continue;
    const k=line.slice(0,sep).trim(), v=line.slice(sep+1).trim().replace(/^['"]|['"]$/g,'');
    if(k&&v&&!process.env[k]) process.env[k]=v;
  }
}
loadEnv('scripts/.env.scripts'); loadEnv('.env');
const PORT=15555;
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
    const r=await client.query(`SELECT COUNT(*) total, COUNT(*) FILTER(WHERE phone IS NULL OR phone='') no_phone, COUNT(*) FILTER(WHERE website IS NULL OR website='') no_web, COUNT(*) FILTER(WHERE image_url IS NULL OR image_url='') no_img FROM app.places WHERE status='active'`);
    const p=r.rows[0];
    console.log(`Toplam: ${p.total} | Telefonsuz: ${p.no_phone} | Websitesiz: ${p.no_web} | Görselsiz: ${p.no_img}`);
    
    // Telefonsuz mekan listesi (ilk 10)
    const r2=await client.query(`SELECT name FROM app.places WHERE status='active' AND (phone IS NULL OR phone='') ORDER BY name LIMIT 10`);
    console.log('Telefonsuz örnekler:', r2.rows.map(r=>r.name).join(', '));
    await client.end(); server.close(); ssh.end();
  }).connect({host:process.env.SSH_HOST,port:parseInt(process.env.SSH_PORT||'77'),username:process.env.SSH_USER,password:process.env.SSH_PASS});
});
ssh.on('error',e=>{console.error(e.message);process.exit(1);});
