/**
 * Security Regression Lock — File Upload Extension via Filename Detection
 *
 * 2026-04-25 audit'inde `upload/index.ts` `file.name.split('.').pop()` ile
 * extension alıyordu — attacker `image/jpeg` MIME + `evil.html` adıyla yükleyip
 * stored XSS yapabilirdi. Fix: MIME → ext mapping table.
 *
 * CLAUDE.md HARD RULE #2: file.name'den extension alma yasak.
 *
 * Bu test STATIC GUARD: gelecek upload endpoint'inde aynı antipattern eklenirse
 * yakalanır. False positive'leri önlemek için `file.name` referans olmadan
 * `.split('.').pop()` patterni de aranır.
 */

import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const SRC_DIR = join(process.cwd(), 'src');

async function* walkTsFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTsFiles(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      yield fullPath;
    }
  }
}

function relativeFromRepoRoot(absolutePath: string): string {
  const sep = process.cwd().includes('\\') ? '\\' : '/';
  return absolutePath.replace(process.cwd() + sep, '').replace(/\\/g, '/');
}

// `file.name.split('.').pop()` — MIME tampering ile XSS vektörü
const FILENAME_EXT_PATTERNS = [
  /file\.name\.split\(['"]\.['"]?\)\.pop\(\)/,
  /\bname\.split\(['"]\.['"]?\)\.pop\(\)/,
];

// Allowlist: legitimate uses (file-storage helper internal sanitization)
const ALLOWED_FILES = new Set<string>([
  // file-storage.ts validateFileExtension uses extname() (path module), safe
]);

describe('Security Regression Lock — file.name extension extraction', () => {
  it('no upload code uses file.name extension (must use MIME mapping)', async () => {
    const violations: { file: string; line: number; content: string }[] = [];

    for await (const filePath of walkTsFiles(SRC_DIR)) {
      const relPath = relativeFromRepoRoot(filePath);
      if (ALLOWED_FILES.has(relPath)) continue;

      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of FILENAME_EXT_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({ file: relPath, line: idx + 1, content: line.trim().slice(0, 120) });
          }
        }
      });
    }

    if (violations.length > 0) {
      const summary = violations.map(v => `  ${v.file}:${v.line}\n    ${v.content}`).join('\n');
      throw new Error(
        `Found ${violations.length} unsafe filename extension extraction(s):\n${summary}\n\n` +
        `Pattern (CLAUDE.md HARD RULE #2):\n` +
        `  ❌ const ext = file.name.split('.').pop()\n` +
        `  ✅ const ext = MIME_TO_EXT[file.type] || 'jpg'\n\n` +
        `Attacker can upload 'image/jpeg' MIME + 'evil.html' name → stored XSS.`
      );
    }

    expect(violations).toEqual([]);
  });
});
