const fs = require('fs');
const path = require('path');

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.astro')) result.push(full);
  }
  return result;
}

const srcDir = path.join(__dirname, '../src');
const files = walk(srcDir);

const replacements = [
  // Fix typo from prefix-match bug: bg-gray-500 was partially replaced
  ['bg-[rgba(184,115,51,0.04)]0', 'bg-[rgba(184,115,51,0.15)]'],

  // Previously missing gray levels
  ['border-gray-100', 'border-[rgba(184,115,51,0.1)]'],
  ['border-gray-400', 'border-[rgba(184,115,51,0.3)]'],
  ['border-gray-500', 'border-[rgba(184,115,51,0.35)]'],
  ['bg-gray-400', 'bg-[rgba(184,115,51,0.2)]'],
  ['bg-gray-500', 'bg-[rgba(184,115,51,0.15)]'],
  ['bg-gray-600', 'bg-[rgba(184,115,51,0.2)]'],
  ['bg-gray-900', 'bg-[#0D0A08]'],
  ['text-gray-300', 'text-[#4A3828]'],
  ['text-gray-200', 'text-[#7A6B58]'],
  ['text-gray-100', 'text-[#EDE0C6]'],

  // Remaining rounded-lg / rounded-xl cleanups
  ['rounded-xl shadow-sm', 'rounded-sm'],
  ['rounded-lg', 'rounded-sm'],
  ['rounded-xl', 'rounded-sm'],

  // hover:bg-gray-* patterns
  ['hover:bg-gray-400', 'hover:bg-[rgba(184,115,51,0.2)]'],
  ['hover:bg-gray-500', 'hover:bg-[rgba(184,115,51,0.25)]'],
  ['hover:bg-gray-600', 'hover:bg-[rgba(184,115,51,0.2)]'],
  ['hover:bg-gray-900', 'hover:bg-[rgba(184,115,51,0.06)]'],

  // disabled:bg-gray-*
  ['disabled:bg-gray-400', 'disabled:opacity-50'],

  // bg-gray-600 text-white button (already caught above but ensure clean)
  ['bg-gray-600 text-white', 'bg-[rgba(184,115,51,0.2)] text-white'],

  // monitoring.astro
  ['bg-gray-50', 'bg-[rgba(184,115,51,0.04)]'],

  // Remaining dark: if any
  // Already handled in pass 1, but safety net:
];

let updated = 0;
const log = [];
for (const filePath of files) {
  if (filePath.includes('node_modules') || filePath.includes('/scripts/')) continue;
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  // Remove any remaining dark: tokens
  content = content.replace(/\bdark:[a-zA-Z0-9/_:[\]().,%-]+/g, '').replace(/[ \t]{2,}/g, ' ');
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    updated++;
    log.push(path.relative(srcDir, filePath));
  }
}
log.forEach(f => console.log('Updated:', f));
console.log('\nTotal updated:', updated);
