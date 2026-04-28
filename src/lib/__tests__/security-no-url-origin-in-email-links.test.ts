/**
 * Static Lock — url.origin / request.url.origin Yasak (Email/External URL) (HARD RULE #40)
 *
 * Reverse proxy (Apache/CWP) arkasında `context.url.origin` veya
 * `new URL(request.url).origin` iç URL döner (örn. `http://localhost:4321`),
 * canonical domain değil. E-posta linklerinde veya external servislere gönderilen
 * URL'lerde kullanılırsa kırık linkler oluşur.
 *
 * Doğru: getPublicAppUrl() from '@/lib/public-app-url'
 * Yasak: context.url.origin, new URL(request.url).origin, url.origin — email/external URL'ler için
 *
 * Kontrol: requestPasswordReset, sendEmail, sendNotification gibi email-sending fonksiyonlarını
 * import eden dosyalar `url.origin` kullanarak origin parametresi oluşturmamalı.
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

// OAuth files previously used url.origin but were fixed to use getPublicAppUrl() in Batch #50.
// If a future file legitimately needs url.origin in an email-sending context, add it here with comment.
const ALLOWED_FILES = new Set<string>([
  'src/lib/__tests__/security-no-url-origin-in-email-links.test.ts',
]);

// Functions that send external-facing URLs (emails, notifications, webhooks with links).
// If a file imports one of these AND uses url.origin, it's a violation.
const EMAIL_SENDING_IMPORTS = [
  'requestPasswordReset',
  'sendPasswordResetEmail',
  'sendVerificationEmail',
  'sendWelcomeEmail',
];

describe('Static Lock — url.origin in email/external links yasak, getPublicAppUrl() zorunlu (HARD RULE #40)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 50 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('files importing email-sending functions must not use url.origin for origin', () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      const rel = toRelative(file);
      if (ALLOWED_FILES.has(rel)) continue;

      // Only check files that import email-sending functions
      const importsEmailFn = EMAIL_SENDING_IMPORTS.some(fn => source.includes(fn));
      if (!importsEmailFn) continue;

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

        // Flag: .url.origin, context.url.origin, new URL(request.url).origin, url.origin
        if (
          line.includes('.url.origin') ||
          line.includes('request.url).origin') ||
          /\burl\.origin\b/.test(line)
        ) {
          violations.push(`${rel}:${i + 1}: ${trimmed}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} dosya email fonksiyonuna url.origin ile origin geçiyor (HARD RULE #40).\n` +
        `Reverse proxy arkasında url.origin iç URL döner (http://localhost:4321).\n` +
        `Doğru: getPublicAppUrl() from '@/lib/public-app-url'\n\n` +
        `Affected lines:\n` +
        violations.map(v => `  - ${v}`).join('\n'),
      );
    }
  });
});
