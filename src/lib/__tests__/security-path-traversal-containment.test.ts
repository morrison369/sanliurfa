/**
 * Static Lock — Path traversal containment check zorunlu (HARD RULE #3)
 *
 * Background: User-supplied / DB-supplied file path'lerinden `unlink()` veya
 * `readFile()` yapmadan önce **mutlaka** containment check (`path.resolve()` +
 * `startsWith(uploadsRoot + sep)`) uygulanmalı. Aksi halde `../../etc/passwd`
 * gibi path traversal saldırılarına açıktır.
 *
 * Allowed pattern (file-storage.ts içindeki helper):
 *   const fullPath = path.resolve(uploadsRoot, userPath);
 *   if (!fullPath.startsWith(uploadsRoot + path.sep)) throw new Error('Path traversal');
 *   await unlinkSync(fullPath);
 *
 * Forbidden pattern:
 *   import { unlinkSync } from 'fs';
 *   await unlinkSync(dbRecord.file_path);  // containment check yok
 *
 * Strategy: `unlinkSync`/`unlink`/`rmSync`/`rm` import'larını file-storage helper
 * modüllerinin DIŞINDA kullanım için yakala. Legitimate kullanımlar (örn. test
 * cleanup, build script) ALLOWED_FILES'a inline yorumla eklenir.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Whitelist — legitimate file-deletion helpers + their callers.
// Her ekleme inline yorumla niye legitimate olduğunu açıklamalı.
const ALLOWED_FILES = new Set<string>([
  'src/lib/file/file-storage.ts',           // saveFile/deleteFile helpers — containment check internally
  'src/lib/upload/upload-service.ts',       // upload service (uses helpers)
  'src/lib/lifecycle.ts',                   // graceful shutdown cleanup (no user input)
  'src/lib/file/temp-file-cleanup.ts',      // server-side temp cleanup (no user input)
]);

const FILE_DELETION_IMPORTS = /from\s*['"]node:fs['"]|from\s*['"]fs['"]/;
const DELETION_FN = /\b(unlink|unlinkSync|rmSync|rm)\b/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && (p.endsWith('.ts') || p.endsWith('.tsx'))) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — Path traversal containment check (HARD RULE #3)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 .ts/.tsx files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no file outside file-storage helpers calls unlink/rm without containment check', () => {
    const violations: Array<{ file: string; line: number; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');

      // Skip files that don't import from fs at all
      const importLines = source.split('\n').slice(0, 50).join('\n');
      if (!FILE_DELETION_IMPORTS.test(importLines)) continue;

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Look for deletion function CALL (not import)
        // Patterns: `unlinkSync(...)`, `await unlink(...)`, `fs.unlinkSync(...)`
        if (
          /\bunlinkSync\s*\(/.test(line) ||
          /\bunlink\s*\(/.test(line) && !/from\s*['"]/.test(line) ||
          /\brmSync\s*\(/.test(line) ||
          /\brm\s*\(/.test(line) && /node:fs|require\(['"]fs['"]/.test(source)
        ) {
          // Skip if line is just an import or destructuring
          if (/^\s*import\s/.test(line) || /^\s*const\s+\{/.test(line)) continue;
          violations.push({ file: rel, line: i + 1, snippet: line.trim() });
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line}\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} unguarded file-deletion call bulundu. ` +
        `path.resolve() + startsWith(uploadsRoot + sep) containment check uygula, ` +
        `veya helper'a (deleteFile from file-storage) taşı. Legitimate ise ` +
        `ALLOWED_FILES'a inline yorumla ekle:\n${msg}`
      );
    }
  });
});
