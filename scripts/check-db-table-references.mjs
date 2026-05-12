#!/usr/bin/env node
/**
 * DB Table Reference Audit
 *
 * Yap-boz pattern'inin temeli: kodda farklı tablo isimleri kullanılırken
 * DB'de farklı tablolar var. Bu oturumda 3 bug bulundu:
 *   - favorites vs user_favorites
 *   - user_activity vs user_activities
 *   - followers vs user_follows
 *
 * Bu script:
 *  1. Codebase'den FROM/INTO/UPDATE/DELETE SQL pattern'leri çıkarır
 *  2. Tablo isimlerini extract eder
 *  3. Bilinen "wrong table" pattern'leri ile karşılaştırır
 *  4. CI'da çalıştırıldığında suspicious matches'i raporlar
 *
 * Kullanım:
 *   node scripts/check-db-table-references.mjs
 *   node scripts/check-db-table-references.mjs --strict  # exit 1 on any suspicious
 */
import fs from 'node:fs';
import path from 'node:path';

const STRICT = process.argv.includes('--strict');
const SCAN_DIRS = ['src/pages/api', 'src/lib', 'src/actions'];
const KNOWN_WRONG_TABLES = {
  'favorites': 'user_favorites',
  'user_activity': 'user_activities',
  'followers': 'user_follows',
  'activity_feed': 'activity_feeds',
};

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...walk(full));
    else if (/\.(ts|tsx|astro|mjs)$/.test(f.name)) results.push(full);
  }
  return results;
}

const SQL_PATTERNS = [
  /FROM\s+([a-z_][a-z0-9_]*)\b/gi,
  /INSERT\s+INTO\s+([a-z_][a-z0-9_]*)\b/gi,
  /UPDATE\s+([a-z_][a-z0-9_]*)\b/gi,
  /DELETE\s+FROM\s+([a-z_][a-z0-9_]*)\b/gi,
  /JOIN\s+([a-z_][a-z0-9_]*)\b/gi,
];

const violations = [];
const files = SCAN_DIRS.flatMap(walk);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of SQL_PATTERNS) {
      pat.lastIndex = 0;
      let match = pat.exec(line);
      while (match !== null) {
        const tbl = match[1].toLowerCase();
        if (KNOWN_WRONG_TABLES[tbl]) {
          violations.push({
            file: file.replace(/\\/g, '/'),
            line: i + 1,
            table: tbl,
            suggested: KNOWN_WRONG_TABLES[tbl],
            snippet: line.trim().slice(0, 120),
          });
        }
        match = pat.exec(line);
      }
    }
  }
}

console.log(`\n🔍 DB Table Reference Audit\n`);
console.log(`Scanned ${files.length} files`);
console.log(`Known wrong tables: ${Object.keys(KNOWN_WRONG_TABLES).join(', ')}\n`);

if (violations.length === 0) {
  console.log('✅ No suspicious table references found.\n');
  process.exit(0);
}

console.log(`⚠️  ${violations.length} suspicious reference(s):\n`);
for (const v of violations) {
  console.log(`  ${v.file}:${v.line}`);
  console.log(`    ${v.snippet}`);
  console.log(`    "${v.table}" → suggested: "${v.suggested}"\n`);
}

if (STRICT) {
  console.log('❌ STRICT mode: exiting with code 1.\n');
  process.exit(1);
}
console.log(`(Run with --strict to fail CI on suspicious refs.)\n`);
