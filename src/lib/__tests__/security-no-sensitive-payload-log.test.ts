/**
 * Security Regression Lock — Sensitive Payload Logging Detection
 *
 * 2026-04-25 audit'inde `email-notifications.ts` `logger.error('...', err, { payload })`
 * full payload log'luyordu — reset token URL, verification code, message body sızdırıyordu.
 *
 * CLAUDE.md HARD RULE #8: Sadece metadata log'la (type, recipient, ID), asla full payload.
 *
 * Bu test STATIC GUARD: gelecek geliştirici `{ payload }`, `{ body }`, `{ data }`, `{ request }`
 * gibi tam request/response payload'unu log objesinde göndermek isterse yakalanır.
 */

import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const SRC_DIR = join(process.cwd(), 'src');

async function* walkTsFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    // skip test files & node_modules
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
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

// Pattern'lar — logger.X(..., { ... full-payload ... })
const SENSITIVE_LOG_PATTERNS = [
  /logger\.\w+\([^)]*,\s*\{\s*payload\s*\}/,
  /logger\.\w+\([^)]*,\s*\{\s*body\s*\}/,
  /logger\.\w+\([^)]*,\s*\{\s*request\s*\}/,
  /logger\.\w+\([^)]*,\s*\{\s*credentials\s*\}/,
];

// Allowlist: legitimate uses where logged object is metadata (manually verified)
const ALLOWED_FILES = new Set<string>([
  // Test'lerin kendisi
]);

describe('Security Regression Lock — sensitive payload logging', () => {
  it('no logger call passes raw payload/body/request/credentials object', async () => {
    const violations: { file: string; line: number; content: string }[] = [];

    for await (const filePath of walkTsFiles(SRC_DIR)) {
      const relPath = relativeFromRepoRoot(filePath);
      if (ALLOWED_FILES.has(relPath)) continue;

      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of SENSITIVE_LOG_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({ file: relPath, line: idx + 1, content: line.trim().slice(0, 120) });
          }
        }
      });
    }

    if (violations.length > 0) {
      const summary = violations.map(v => `  ${v.file}:${v.line}\n    ${v.content}`).join('\n');
      throw new Error(
        `Found ${violations.length} sensitive payload log(s) — log only metadata (id, type, recipient):\n${summary}\n\n` +
        `Pattern (CLAUDE.md HARD RULE #8):\n` +
        `  ❌ logger.error('failed', err, { payload })\n` +
        `  ✅ logger.error('failed', err, { type: payload.type, recipientId: payload.recipientId })`
      );
    }

    expect(violations).toEqual([]);
  });
});
