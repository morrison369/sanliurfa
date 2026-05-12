/**
 * Batch 10 — Kalan eski copper rengi + admin/monitoring.astro JS string gray sınıfları
 */
const fs = require('fs');

const files = [
  'src/components/home/HeroSection.astro',
  'src/components/home/LiveCityDataSection.astro',
  'src/components/home/PwaInstallSection.astro',
  'src/components/ui/StatusStrip.astro',
  'src/pages/admin/monitoring.astro',
];

const replacements = [
  // ── Copper renk sabiti ──────────────────────────────────────────────────
  ['rgba(200,160,100,0.35)', 'rgba(184,115,51,0.35)'],
  ['rgba(200,160,100,0.28)', 'rgba(184,115,51,0.28)'],
  ['rgba(200,160,100,0.25)', 'rgba(184,115,51,0.25)'],
  ['rgba(200,160,100,0.2)',  'rgba(184,115,51,0.2)'],
  ['rgba(200,160,100,0.18)', 'rgba(184,115,51,0.18)'],
  ['rgba(200,160,100,0.14)', 'rgba(184,115,51,0.14)'],
  ['rgba(200,160,100,0.1)',  'rgba(184,115,51,0.1)'],
  ['rgba(200,160,100,0.08)', 'rgba(184,115,51,0.08)'],
  ['rgba(200,160,100,0.06)', 'rgba(184,115,51,0.06)'],
  ['rgba(200,160,100,0.04)', 'rgba(184,115,51,0.04)'],

  // ── monitoring.astro: renkli badge'ler (compound önce) ──────────────────
  ['bg-red-100 text-red-800',      'bg-[rgba(239,68,68,0.15)] text-red-400'],
  ['bg-orange-100 text-orange-800', 'bg-[rgba(249,115,22,0.15)] text-orange-400'],
  ['bg-yellow-100 text-yellow-800', 'bg-[rgba(234,179,8,0.15)] text-yellow-400'],
  ['bg-blue-100 text-blue-800',    'bg-[rgba(59,130,246,0.15)] text-blue-400'],
  ['bg-red-100 text-red-700',      'bg-[rgba(239,68,68,0.15)] text-red-400'],
  ['bg-orange-100 text-orange-700', 'bg-[rgba(249,115,22,0.15)] text-orange-400'],

  // ── monitoring.astro: text-gray-* (spesifik → genel) ───────────────────
  ['text-gray-900', 'text-[#EDE0C6]'],
  ['text-gray-800', 'text-[#EDE0C6]'],
  ['text-gray-700', 'text-[#C4A882]'],
  ['text-gray-600', 'text-[#7A6B58]'],
  ['text-gray-500', 'text-[#7A6B58]'],
  ['text-gray-400', 'text-[#4A3828]'],

  // ── monitoring.astro: bg + border gray ─────────────────────────────────
  ['bg-gray-100', 'bg-[rgba(184,115,51,0.08)]'],
  ['border-gray-200', 'border-[rgba(184,115,51,0.14)]'],
];

let totalChanged = 0;

files.forEach(rel => {
  const path = require('path').join(__dirname, '..', rel);
  if (!fs.existsSync(path)) { console.log(`SKIP (not found): ${rel}`); return; }

  let content = fs.readFileSync(path, 'utf8');
  const original = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    fs.writeFileSync(path, content, 'utf8');
    console.log(`UPDATED: ${rel}`);
    totalChanged++;
  } else {
    console.log(`no change: ${rel}`);
  }
});

console.log(`\nDone — ${totalChanged} files updated.`);
