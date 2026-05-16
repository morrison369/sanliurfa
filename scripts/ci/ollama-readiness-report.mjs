#!/usr/bin/env node
/* global console, process, fetch, AbortSignal */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outFile = path.join(docsDir, 'ollama-readiness-report.json');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').replace(/\\n/g, '\n').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

for (const file of [
  path.join(root, '.env'),
  path.join(root, '.env.local'),
  path.join(root, '.env.production'),
  path.join(root, 'scripts/.env.scripts'),
]) {
  loadEnv(file);
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const baseUrl = process.env.OLLAMA_BASE_URL || 'https://ollama.com/api';
const isCloud = /ollama\.com/i.test(baseUrl);
const apiKeyPresent = Boolean(process.env.OLLAMA_API_KEY);
const live = process.argv.includes('--live') || process.env.OLLAMA_READINESS_LIVE === '1';

const scripts = [
  'ollama-generate-blog-posts.mjs',
  'ollama-generate-place-descriptions.mjs',
  'ollama-generate-place-meta.mjs',
  'ollama-generate-blog-meta.mjs',
  'ollama-fix-thin-content.mjs',
].map((name) => ({
  rel: `scripts/${name}`,
  ok: exists(`scripts/${name}`),
}));

const result = {
  generatedAt: new Date().toISOString(),
  status: 'ok',
  mode: isCloud ? 'cloud' : 'local',
  baseUrl: isCloud ? 'https://ollama.com/api' : baseUrl,
  apiKeyPresent,
  liveChecked: false,
  liveOk: null,
  model: process.env.OLLAMA_MODEL || 'gemma4:31b',
  fallbackModel: process.env.OLLAMA_FALLBACK_MODEL || 'ministral-3:14b',
  fallback2Model: process.env.OLLAMA_FALLBACK2_MODEL || 'nemotron-3-super',
  files: {
    sharedLib: { rel: 'scripts/ollama-lib.mjs', ok: exists('scripts/ollama-lib.mjs') },
    astroClient: { rel: 'src/lib/ai/ollama.ts', ok: exists('src/lib/ai/ollama.ts') },
    contentBot: {
      rel: 'src/pages/api/admin/content-bot/generate.ts',
      ok: exists('src/pages/api/admin/content-bot/generate.ts'),
    },
  },
  scripts,
  packageScripts: [
    { name: 'ollama:readiness', ok: typeof pkg.scripts?.['ollama:readiness'] === 'string' },
    { name: 'ollama:readiness:live', ok: typeof pkg.scripts?.['ollama:readiness:live'] === 'string' },
  ],
  policy: {
    turkishOnly: true,
    draftFirst: true,
    noFakeFacts: true,
    localStorageOnlyForImages: true,
    liveCheckOptional: true,
  },
};

if (live) {
  result.liveChecked = true;
  try {
    if (isCloud && !apiKeyPresent) throw new Error('OLLAMA_API_KEY eksik');
    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        ...(process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: result.fallbackModel,
        messages: [{ role: 'user', content: 'Sadece "hazır" yaz.' }],
        stream: false,
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(45000),
    });
    result.liveOk = response.ok;
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        detail = data?.error || detail;
      } catch {}
      result.liveError = detail;
    }
  } catch (error) {
    result.liveOk = false;
    result.liveError = error.message;
  }
}

const blockers = [
  isCloud && !apiKeyPresent,
  !Object.values(result.files).every((item) => item.ok),
  !result.scripts.every((item) => item.ok),
  !result.packageScripts.every((item) => item.ok),
  live && result.liveOk !== true,
];

result.status = blockers.some(Boolean) ? 'blocked' : 'ok';

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

console.log(
  `ollama-readiness: ${result.status.toUpperCase()} ` +
    `(mode=${result.mode}, key=${apiKeyPresent ? 'present' : 'missing'}, live=${result.liveChecked ? (result.liveOk ? 'ok' : 'fail') : 'skipped'})`,
);

if (result.status !== 'ok') process.exit(1);
