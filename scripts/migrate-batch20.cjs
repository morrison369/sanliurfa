/**
 * Batch 20 — SCM slate-700/800/900/950 preview section bg+border,
 *             text-slate-800 kart butonları, bg-slate-100 recentReviews,
 *             DarkModeToggle zinc-700, SCM admin filter button border-slate-300,
 *             önceki batch'ten kalan prefix-collision artıkları (0/15 suffix)
 *
 * KORUNANLAR:
 *   bg-sky-900/40 text-sky-300  (PlaceCard doğa kategorisi — dark bg uyumlu)
 *   text-sky-300 / text-violet-303 (DistrictServiceSection)
 *   bg-[linear-gradient(...)] audience plan kartları (gradient keep)
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
  // ── Prefix-collision artıkları (önceki batch'lerin bozduğu kalıplar) ─────
  // bg-red-500/15 → bg-[rgba(239,68,68,0.1)] dönüşümü /15 suffix bırakmış
  ['bg-[rgba(239,68,68,0.1)]0/15',          'bg-[rgba(239,68,68,0.06)]'],
  ['hover:bg-[rgba(239,68,68,0.1)]0/25',    'hover:bg-[rgba(239,68,68,0.1)]'],
  // bg-slate-950/15 → bg-[rgba(184,115,51,0.04)] dönüşümü 0/15 bırakmış
  ['bg-[rgba(184,115,51,0.04)]0/15',        'bg-[rgba(184,115,51,0.06)]'],
  // border-slate-500/40 (SCM badge artığı)
  ['border-slate-500/40',                   'border-[rgba(184,115,51,0.2)]'],

  // ── DarkModeToggle: zinc-707 → copper ────────────────────────────────────
  ['text-zinc-700', 'text-[#C4A882]'],

  // ── SCM searchInputClass text-slate-808 (batch 19 -808 aradı, -808 vardı) ──
  ["'flex-1 rounded-sm px-5 py-4 text-slate-800 focus:outline-none'",
   "'flex-1 rounded-sm px-5 py-4 text-[#EDE0C6] focus:outline-none'"],

  // ── SCM recentReviews bg-slate-100 (açık bg, dark temaya geçiriliyor) ────
  ["'bg-slate-100 text-[#EDE0C6] py-14 border-t border-[rgba(184,115,51,0.14)]'",
   "'bg-[rgba(184,115,51,0.06)] text-[#EDE0C6] py-14 border-t border-[rgba(184,115,51,0.14)]'"],

  // ── SCM kart/buton text-slate-808 (compound — spesifik önce) ────────────
  ['bg-[var(--bg-card)] px-4 py-4 text-sm font-semibold text-slate-800 transition',
   'bg-[var(--bg-card)] px-4 py-4 text-sm font-semibold text-[#C4A882] transition'],
  ['bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-slate-800 transition',
   'bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[#C4A882] transition'],
  ['bg-[rgba(184,115,51,0.04)] px-5 py-4 font-semibold text-slate-800 transition',
   'bg-[rgba(184,115,51,0.04)] px-5 py-4 font-semibold text-[#C4A882] transition'],

  // ── SCM admin filtre butonu (compound — tam string) ──────────────────────
  ['border border-slate-300 bg-[var(--bg-card)] px-3 py-1 text-xs font-semibold text-[#C4A882] transition hover:border-slate-500 hover:bg-slate-100',
   'border border-[rgba(184,115,51,0.2)] bg-[var(--bg-card)] px-3 py-1 text-xs font-semibold text-[#C4A882] transition hover:border-[rgba(184,115,51,0.4)] hover:bg-[rgba(184,115,51,0.08)]'],

  // ── SCM preview bölüm bg: opacity varyantlar önce (prefix collision önleme) ─
  ['bg-slate-900/70',  'bg-[rgba(13,10,8,0.70)]'],
  ['bg-slate-900/60',  'bg-[rgba(13,10,8,0.60)]'],
  ['bg-slate-900/80',  'bg-[rgba(13,10,8,0.80)]'],
  ['bg-slate-950/80',  'bg-[rgba(13,10,8,0.80)]'],
  // Catch-all bg (opacity varyantlar yukarıda tükendi)
  ['bg-slate-950',     'bg-[#0D0A08]'],
  ['bg-slate-900',     'bg-[rgba(13,10,8,0.97)]'],

  // ── SCM preview bölüm border ──────────────────────────────────────────────
  ['border-slate-800', 'border-[rgba(184,115,51,0.1)]'],
  ['border-slate-700', 'border-[rgba(184,115,51,0.15)]'],

  // ── SCM hover border ──────────────────────────────────────────────────────
  ['hover:border-slate-400', 'hover:border-[rgba(184,115,51,0.5)]'],
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
