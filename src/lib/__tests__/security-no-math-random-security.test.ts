/**
 * Static Lock — Math.random() Banned in Security-Critical Files (HARD RULE #38)
 *
 * Math.random() is NOT cryptographically secure: seeded from a weak entropy
 * source, ~53 bits of effective entropy, predictable sequence. Using it for
 * tokens, IDs, filenames, or session identifiers allows attackers to:
 *   - Enumerate/guess generated identifiers
 *   - Brute-force security tokens
 *   - Predict future values from observed ones (V8 engine leak)
 *
 * Use crypto.randomBytes() for any security-sensitive randomness.
 *
 * Scoped to security-critical directories only — analytics/AI/simulation
 * files legitimately use Math.random() for non-security purposes.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

// Security-critical directories and files where Math.random() is banned.
// Analytics, AI simulation, and rendering files are excluded — they use
// Math.random() for legitimate non-security purposes (jitter, sampling, etc.).
const SECURITY_ROOTS = [
  join(process.cwd(), 'src', 'lib', 'auth'),
  join(process.cwd(), 'src', 'lib', 'security'),
  join(process.cwd(), 'src', 'lib', 'file'),
];
const SECURITY_FILES = [
  join(process.cwd(), 'src', 'middleware.ts'),
  join(process.cwd(), 'src', 'lib', 'api.ts'),
  join(process.cwd(), 'src', 'lib', 'audit.ts'),
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      out.push(...walk(p));
    } else if (s.isFile() && /\.tsx?$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

function toRelative(absolute: string): string {
  const parts = absolute.split(sep);
  const idx = parts.indexOf('src');
  return parts.slice(idx).join('/');
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const root of SECURITY_ROOTS) {
    files.push(...walk(root));
  }
  files.push(...SECURITY_FILES);
  return files;
}

describe('Static Lock — Math.random() banned in security-critical files (HARD RULE #38)', () => {
  const files = collectFiles();

  it('finds security-critical files to scan (sanity)', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it('no security-critical file uses Math.random()', () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      if (!source.includes('Math.random')) continue;

      const rel = toRelative(file);
      const lines = source.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        if (line.includes('Math.random')) {
          violations.push(`${rel}:${i + 1}: ${trimmed}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} güvenlik-kritik dosyada Math.random() kullanımı (HARD RULE #38).\n` +
        `crypto.randomBytes() kullanın — Math.random() kriptografik olarak güvenli değil.\n\n` +
        `Affected lines:\n` +
        violations.map(v => `  - ${v}`).join('\n'),
      );
    }
  });
});
