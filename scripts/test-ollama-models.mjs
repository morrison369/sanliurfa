#!/usr/bin/env node
/**
 * Ollama cloud modellerini Türkçe içerik kalitesi için test eder.
 * Rate limit bilgilerini de gösterir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const KEY = process.env.OLLAMA_API_KEY;
const BASE = process.env.OLLAMA_BASE_URL || 'https://ollama.com/api';

if (!KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
console.log(`API: ${BASE}`);
console.log(`Key: ${KEY.slice(0, 12)}...\n`);

const PROMPT = `Şanlıurfa hakkında 3 cümle yaz. Türkçe, SEO uyumlu, doğal ve akıcı olsun. Sadece paragraf yaz, başlık ekleme.`;

const MODELS = [
  'gemma4:31b', 'gemma4:27b', 'gemma4:12b',
  'ministral-3:24b', 'ministral-3:14b', 'ministral-3:7b',
  'nemotron-3-super', 'nemotron-3-nano',
  'kimi-k2.5', 'glm-4.7', 'minimax-m2.1',
  'devstral-small-2',
];

async function testModel(model) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Sen Türkçe içerik yazarısın. Sadece Türkçe yaz.' },
          { role: 'user', content: PROMPT },
        ],
        stream: false,
        options: { temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(45000),
    });

    // Rate limit header'larını kontrol et
    const rl = {};
    ['x-ratelimit-limit-requests','x-ratelimit-limit-tokens',
     'x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens',
     'x-ratelimit-reset-requests','x-ratelimit-reset-tokens',
     'retry-after', 'x-request-id'].forEach(h => {
      const v = res.headers.get(h);
      if (v) rl[h] = v;
    });

    const elapsed = Date.now() - t0;

    if (!res.ok) {
      const txt = await res.text();
      return { model, ok: false, status: res.status, error: txt.slice(0, 150), elapsed, rl };
    }

    const data = await res.json();
    const content = (data.message?.content || '').trim();
    const wordCount = content.split(/\s+/).length;
    const hasTurkish = /[şığöüç]/i.test(content);

    return { model, ok: true, status: res.status, content: content.slice(0, 200), wordCount, hasTurkish, elapsed, rl };
  } catch (e) {
    return { model, ok: false, error: e.message.slice(0, 100), elapsed: Date.now() - t0, rl: {} };
  }
}

for (const model of MODELS) {
  process.stdout.write(`\nTest: ${model}... `);
  const r = await testModel(model);
  if (r.ok) {
    console.log(`✓ ${r.elapsed}ms | ${r.wordCount} kelime | Türkçe: ${r.hasTurkish ? '✓' : '✗'}`);
    console.log(`  "${r.content.slice(0, 120)}..."`);
  } else {
    console.log(`✗ HTTP ${r.status || 'timeout'} — ${r.error || 'bağlanamadı'} (${r.elapsed}ms)`);
  }
  if (Object.keys(r.rl).length) {
    console.log('  Rate-limit:', JSON.stringify(r.rl));
  }
  // Rate limit aşmamak için bekle
  await new Promise(r => setTimeout(r, 2000));
}

console.log('\n--- Özet ---');
console.log('Ollama Free Tier Rate Limits (kayıt yoksa API header açıklamıyor):');
console.log('• Session limiti: 5 saatte bir sıfırlanır');
console.log('• Haftalık limit: 7 günde bir sıfırlanır');
console.log('• Eşzamanlı model: 1 (free), 3 (pro), 10 (max)');
console.log('• Kesin RPM/TPM rakamı: yayınlanmamış');
console.log('• Önerilen bekleme: istekler arası ≥1500ms');
