/**
 * Static Lock — Backup Code / Secret Karşılaştırmasında indexOf/includes Yasak (HARD RULE #44)
 *
 * Array.prototype.indexOf ve Array.prototype.includes JavaScript motorunda `===` ile kıyaslar;
 * ilk farklı karakterde kısa devre yapar → timing side-channel. Backup code veya OTP
 * listesinde bu metodlar kullanılmamalı; constant-time karşılaştırma (`timingSafeEqual`)
 * zorunlu.
 *
 * Doğru:
 *   backupCodes.findIndex((c: string) => {
 *     const a = Buffer.from(c); const b = Buffer.from(code);
 *     return a.length === b.length && timingSafeEqual(a, b);
 *   });
 *
 * Yasak: backupCodes.indexOf(code), backupCodes.includes(code)
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

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

// Files that intentionally use indexOf on non-sensitive arrays (no backup/secret codes).
const ALLOWED_FILES = new Set<string>([
  'src/lib/__tests__/security-no-backup-code-indexof.test.ts',
]);

// Context terms that indicate a backup code / secret comparison context.
const SENSITIVE_CONTEXT_TERMS = [
  'backupCodes',
  'backup_codes',
  'recoveryCode',
  'recovery_code',
  'secretCode',
  'otpCode',
  'verificationCode',
];

// Patterns that signal a non-constant-time comparison of a sensitive code list.
const FORBIDDEN_PATTERNS = [
  /\bindexOf\s*\(/,
  /\bincludes\s*\(/,
];

describe('Static Lock — backup code / secret karşılaştırmasında indexOf/includes yasak (HARD RULE #44)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 50 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('backup code / secret array comparisons must use timingSafeEqual, not indexOf/includes', () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      const rel = toRelative(file);
      if (ALLOWED_FILES.has(rel)) continue;

      // Only check files that reference sensitive code lists
      const hasSensitiveContext = SENSITIVE_CONTEXT_TERMS.some(term => source.includes(term));
      if (!hasSensitiveContext) continue;

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            // Check if the line or surrounding context involves a sensitive term
            const context = lines.slice(Math.max(0, i - 2), i + 2).join(' ');
            const isSensitive = SENSITIVE_CONTEXT_TERMS.some(term => context.includes(term));
            if (isSensitive) {
              violations.push(`${rel}:${i + 1}: ${trimmed}`);
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} satır backup code / secret listesinde indexOf/includes kullanıyor (HARD RULE #44).\n` +
        `Timing side-channel: === kısa devre yapar, first-char leak oluşur.\n` +
        `Doğru: findIndex + timingSafeEqual(Buffer.from(a), Buffer.from(b))\n\n` +
        `Affected lines:\n` +
        violations.map(v => `  - ${v}`).join('\n'),
      );
    }
  });
});
