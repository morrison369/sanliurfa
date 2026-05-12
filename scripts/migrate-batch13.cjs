/**
 * Batch 13 — Kalan açık mavi/indigo/purple badge'ler, link renkleri,
 *             SiteContentManager indigo info box'ları, hover:bg-urfa-600 fix
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
  // ── hover:bg-urfa-600 bug fix (should be urfa-700) ──────────────────────
  ['bg-urfa-600 hover:bg-urfa-600', 'bg-urfa-600 hover:bg-urfa-700'],

  // ── Compound blue badge (trailing space preserved) ───────────────────────
  ["'bg-blue-100 text-blue-800 '", "'bg-[rgba(59,130,246,0.1)] text-blue-300 '"],
  ["'bg-blue-100 text-blue-700 '", "'bg-[rgba(59,130,246,0.1)] text-blue-300 '"],

  // ── Compound blue badge with extra classes ───────────────────────────────
  ['bg-blue-100 text-blue-700 px-2 py-1 rounded-sm', 'bg-[rgba(59,130,246,0.1)] text-blue-300 px-2 py-1 rounded-sm'],
  ['bg-blue-100 text-blue-700 px-2 py-1 rounded',    'bg-[rgba(59,130,246,0.1)] text-blue-300 px-2 py-1 rounded-sm'],
  ['bg-blue-100 text-blue-800 px-2 py-1 rounded-sm', 'bg-[rgba(59,130,246,0.1)] text-blue-300 px-2 py-1 rounded-sm'],
  ['bg-blue-100 text-blue-800 px-2 py-1 rounded',    'bg-[rgba(59,130,246,0.1)] text-blue-300 px-2 py-1 rounded-sm'],

  // ── blue badge + hover ───────────────────────────────────────────────────
  ['bg-blue-100 text-blue-700 rounded hover:bg-blue-200', 'bg-[rgba(59,130,246,0.1)] text-blue-300 rounded-sm hover:bg-[rgba(59,130,246,0.18)]'],
  ['bg-blue-100 text-blue-800 rounded hover:bg-blue-200', 'bg-[rgba(59,130,246,0.1)] text-blue-300 rounded-sm hover:bg-[rgba(59,130,246,0.18)]'],

  // ── Simple blue badge (catch-all) ────────────────────────────────────────
  ['bg-blue-100 text-blue-800', 'bg-[rgba(59,130,246,0.1)] text-blue-300'],
  ['bg-blue-100 text-blue-700', 'bg-[rgba(59,130,246,0.1)] text-blue-300'],
  ['bg-blue-100',               'bg-[rgba(59,130,246,0.1)]'],

  // ── hover:bg-blue-200 (remaining) ────────────────────────────────────────
  ['hover:bg-blue-200', 'hover:bg-[rgba(59,130,246,0.18)]'],

  // ── Purple badges ─────────────────────────────────────────────────────────
  ['bg-purple-50 rounded-sm p-6 border border-purple-200', 'bg-[rgba(168,85,247,0.06)] rounded-sm p-6 border border-[rgba(168,85,247,0.2)]'],
  ['bg-purple-100 text-purple-800', 'bg-[rgba(168,85,247,0.1)] text-purple-300'],
  ['bg-purple-100 text-purple-700', 'bg-[rgba(168,85,247,0.1)] text-purple-300'],
  ['bg-purple-100',                 'bg-[rgba(168,85,247,0.1)]'],
  ['bg-purple-50',                  'bg-[rgba(168,85,247,0.06)]'],
  ['border-purple-200',             'border-[rgba(168,85,247,0.2)]'],
  ['text-purple-800',               'text-purple-300'],
  ['text-purple-700',               'text-purple-300'],

  // ── SiteContentManager indigo info boxes ─────────────────────────────────
  ['border-indigo-400', 'border-[rgba(99,102,241,0.4)]'],
  ['border-indigo-300', 'border-[rgba(99,102,241,0.3)]'],
  ['border-indigo-200', 'border-[rgba(99,102,241,0.2)]'],
  ['border-indigo-100', 'border-[rgba(99,102,241,0.15)]'],
  ['bg-indigo-50',      'bg-[rgba(99,102,241,0.08)]'],
  ['hover:bg-indigo-100', 'hover:bg-[rgba(99,102,241,0.12)]'],
  ['text-indigo-950',   'text-[#EDE0C6]'],
  ['text-indigo-700',   'text-[#C4A882]'],
  ['text-indigo-600',   'text-[#9C7A5A]'],
  ['text-indigo-500',   'text-[#B87333]'],

  // ── Blue link colors ──────────────────────────────────────────────────────
  ['text-blue-600 hover:text-blue-700 block mb-2',   'text-[#C4A882] hover:text-[#EDE0C6] block mb-2'],
  ['text-blue-600 hover:text-blue-700 font-medium',  'text-[#C4A882] hover:text-[#EDE0C6] font-medium'],
  ['text-blue-600 hover:text-blue-700',              'text-[#C4A882] hover:text-[#EDE0C6]'],
  ['text-blue-600 hover:text-blue-800',              'text-[#C4A882] hover:text-[#EDE0C6]'],

  // ── Remaining blue text ───────────────────────────────────────────────────
  ['text-blue-800', 'text-blue-300'],
  ['text-blue-700', 'text-blue-300'],
  ['text-blue-600', 'text-[#C4A882]'],

  // ── hover:text-blue-* ─────────────────────────────────────────────────────
  ['hover:text-blue-700', 'hover:text-[#EDE0C6]'],
  ['hover:text-blue-800', 'hover:text-[#EDE0C6]'],
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
