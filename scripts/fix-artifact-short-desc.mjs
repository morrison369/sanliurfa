import { getOllamaConfig, ollamaChat } from './ollama-lib.mjs';
import { Client } from 'ssh2';
import net from 'net';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.scripts') });

const { Pool } = pg;
const config = getOllamaConfig();

const places = [
  { id: '2fb45169-9f80-42c8-82c0-31430041a1c7', name: 'Ceylanpınar GAP Tarım İşletmesi' },
  { id: '65e02e2b-d875-4fe9-89d2-107477dc1cd5', name: 'Ceylanpınar Devlet Hastanesi' },
  { id: '6754d8ff-e5af-4aff-961f-a28f8986b87b', name: 'Ceylanpınar Belediyesi' },
  { id: '6b38c555-294a-4d6f-abb5-2f43a888f4a7', name: 'Akçakale Devlet Hastanesi' },
  { id: 'a08b0dab-813f-47b3-ab4e-665a843d175c', name: 'Akçakale Belediyesi' },
];

console.log('Ollama ile short_description üretiliyor...');
const results = [];
for (const p of places) {
  const msgs = [{ role: 'user', content: `Şanlıurfa'daki "${p.name}" mekanı için kısa bir tanıtım yaz. Tam olarak 1-2 cümle, 100-130 karakter, Türkçe, bilgilendirici. Sadece tanıtım cümlesini yaz, başka hiçbir şey ekleme.` }];
  const res = await ollamaChat(msgs, config.MODEL, config);
  const clean = res.trim().replace(/^[\"'*]+|[\"'*]+$/g, '').substring(0, 150);
  results.push({ id: p.id, name: p.name, desc: clean });
  console.log(`✓ ${p.name}: ${clean}`);
  await new Promise(r => setTimeout(r, 2000));
}

console.log('\nDB güncelleniyor...');
const ssh = new Client();
await new Promise((resolve, reject) => {
  ssh.on('ready', () => {
    const server = net.createServer((sock) => {
      ssh.forwardOut('127.0.0.1', 0, 'localhost', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream).pipe(sock);
      });
    });
    server.listen(15578, '127.0.0.1', async () => {
      const pool = new Pool({ host: '127.0.0.1', port: 15578, user: 'sanliur_sanliurfa', password: process.env.DB_PASS, database: 'sanliur_sanliurfa', ssl: false });
      try {
        for (const r of results) {
          await pool.query('UPDATE places SET short_description = $1 WHERE id = $2', [r.desc, r.id]);
          console.log('Güncellendi:', r.name);
        }
        console.log('Tamamlandı!');
      } finally {
        await pool.end();
        server.close();
        ssh.end();
        resolve();
      }
    });
  }).on('error', reject)
    .connect({ host: '168.119.79.238', port: 77, username: 'sanliur', password: process.env.SSH_PASS });
});
