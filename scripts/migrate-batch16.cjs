/**
 * Batch 16 — Batch 15'te kaçan rose/emerald-700 badge'ler (typo fix),
 *             amber badge/image placeholder, green-800/700 text,
 *             rose-700/green-707 dark text, slate secondary butonlar, sky info card
 */
const fs = require('fs');
const path = require('path');

function collectFiles(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...collectFiles(full, exts));
    } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = collectFiles(srcDir, ['.tsx', '.astro']);

const replacements = [
  // ── SiteContentManager — rose/emerald outline toggle badge'leri (düzeltme) ─
  // (batch 15'te "707" yazıldı ama gerçekte "700" — tüm varyantlar)
  ['border-rose-300 px-2 py-1 text-xs text-rose-700',
   'border-[rgba(239,68,68,0.35)] px-2 py-1 text-xs text-rose-400'],
  ['border-emerald-400 px-3 py-1 text-xs text-emerald-700',
   'border-[rgba(34,197,94,0.45)] px-3 py-1 text-xs text-emerald-400'],
  ['border-emerald-400 px-2 py-1 text-xs text-emerald-700',
   'border-[rgba(34,197,94,0.45)] px-2 py-1 text-xs text-emerald-400'],
  ['border-emerald-400 px-2 py-1 text-[10px] text-emerald-700',
   'border-[rgba(34,197,94,0.45)] px-2 py-1 text-[10px] text-emerald-400'],

  // ── Amber badge (IntegrationsSettings "Yapılandırılmamış") ───────────────
  ['bg-amber-100 text-amber-700 rounded',
   'bg-[rgba(234,179,8,0.12)] text-amber-400 rounded-sm'],

  // ── Amber image placeholder (SCM recipes) ────────────────────────────────
  ["'h-44 overflow-hidden bg-amber-100'",
   "'h-44 overflow-hidden bg-[rgba(184,115,51,0.08)]'"],

  // ── Amber CTA buton (SCM) → copper ───────────────────────────────────────
  ['bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700',
   'bg-urfa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-urfa-700'],

  // ── Sky info kart (SCM live status preview) → copper ─────────────────────
  ['border-sky-400/50 bg-sky-500/15 p-4 transition hover:border-sky-300 hover:bg-sky-500/25',
   'border-[rgba(184,115,51,0.3)] bg-[rgba(184,115,51,0.08)] p-4 transition hover:border-[rgba(184,115,51,0.5)] hover:bg-[rgba(184,115,51,0.12)]'],

  // ── Slate secondary butonlar (SCM admin panel butonları) → copper dark ────
  ['bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60',
   'bg-[rgba(184,115,51,0.14)] px-4 py-2 text-sm font-semibold text-[#EDE0C6] hover:bg-[rgba(184,115,51,0.22)] disabled:opacity-60'],
  ['bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800',
   'bg-[rgba(184,115,51,0.14)] px-4 py-2 text-sm font-semibold text-[#EDE0C6] hover:bg-[rgba(184,115,51,0.22)]'],
  ['bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-black',
   'bg-[rgba(184,115,51,0.1)] px-4 py-2 text-sm font-semibold text-[#EDE0C6] hover:bg-[rgba(184,115,51,0.18)]'],
  ['bg-slate-900 px-4 py-2 text-sm font-semibold text-white',
   'bg-[rgba(184,115,51,0.08)] px-4 py-2 text-sm font-semibold text-[#EDE0C6]'],
  ['bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white',
   'bg-[rgba(184,115,51,0.08)] px-3 py-1.5 text-xs font-semibold text-[#EDE0C6]'],

  // ── Green dark text (dark bg'de görünmez) ─────────────────────────────────
  ['text-green-800', 'text-green-400'],
  ['text-green-700', 'text-green-400'],

  // ── Rose/red dark text (dark bg'de görünmez) ──────────────────────────────
  ['text-rose-700', 'text-rose-400'],
  ['text-red-800',  'text-red-400'],

  // ── Catch-all: kalan amber ────────────────────────────────────────────────
  ['bg-amber-100',  'bg-[rgba(234,179,8,0.12)]'],
  ['text-amber-700','text-amber-400'],

  // ── Catch-all: kalan rose/emerald border+text ─────────────────────────────
  ['border-rose-300',  'border-[rgba(239,68,68,0.35)]'],
  ['border-emerald-400','border-[rgba(34,197,94,0.45)]'],
  ['text-rose-700',    'text-rose-400'],
  ['text-emerald-700', 'text-emerald-400'],
];

let totalChanged = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanged++;
    console.log(`UPDATED: ${path.relative(path.join(__dirname, '..'), filePath)}`);
  }
}

console.log(`\nDone — ${totalChanged} / ${files.length} files updated.`);
