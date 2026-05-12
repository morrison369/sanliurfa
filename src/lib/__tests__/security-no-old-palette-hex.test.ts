/**
 * Static Lock — Eski theme palette hex'leri yasak (HARD RULE #20)
 *
 * Background: 2026-04-26 modern theme migration sonrası eski Şanlıurfa palette hex'leri
 * (önceki urfa kahverengi 50-900) artık yasak. Yeni palette CSS variable'larına geçiş
 * tamamlandı; eski hex'ler regression olarak yeniden eklenirse CI fail.
 *
 * Allowed pattern (yeni palette):
 *   --color-urfa-500: #be7239;        (yeni)
 *   color: var(--color-urfa-500);     (CSS variable usage — preferred)
 *   class="bg-urfa-500"               (Tailwind utility — preferred)
 *
 * Forbidden hex'ler (eski palette, replaced 2026-04-26):
 *   #fdf8f6, #f2e8e5, #eaddd7, #e0cec7, #d2bab0, #a18072,
 *   #8a6a5c, #735448, #5c4239, #45322b
 *
 * Whitelist: yok — sweep tam temiz, exception olmamalı.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Whitelist — sweep sonucu boş, yeni eklemeler explicit reason ile gelmeli.
const ALLOWED_FILES = new Set<string>([
  // Şu an exception yok.
]);

// Eski Şanlıurfa palette hex'leri (case-insensitive)
const OLD_PALETTE_HEX = [
  '#fdf8f6', '#f2e8e5', '#eaddd7', '#e0cec7', '#d2bab0',
  '#a18072', '#8a6a5c', '#735448', '#5c4239', '#45322b',
];

const HEX_PATTERN = new RegExp(
  `(${OLD_PALETTE_HEX.map(h => h.replace('#', '#')).join('|')})\\b`,
  'gi'
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(astro|css|tsx?|jsx?|mdx?|html)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — Eski palette hex yasak (HARD RULE #20)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no source file references old Şanlıurfa palette hex', () => {
    const violations: Array<{ file: string; line: number; hex: string; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      if (!HEX_PATTERN.test(source)) continue;
      HEX_PATTERN.lastIndex = 0; // reset stateful regex

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
        const matches = line.match(HEX_PATTERN);
        if (matches) {
          for (const hex of matches) {
            violations.push({ file: rel, line: i + 1, hex: hex.toLowerCase(), snippet: line.trim() });
          }
        }
        HEX_PATTERN.lastIndex = 0;
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line} — ${v.hex}\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} eski palette hex referansı bulundu. Yeni palette ` +
        `(urfa-{50-950}, isot-{50-950}) Tailwind utility veya CSS variable ` +
        `(var(--color-urfa-500)) ile değiştir:\n${msg}`
      );
    }
  });
});
