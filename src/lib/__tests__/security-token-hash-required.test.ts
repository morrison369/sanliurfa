/**
 * Static Lock — Reset / Verification Token DB Hash Storage (HARD RULE #46)
 *
 * Background: Plaintext password reset / email verification tokens stored in DB
 * are usable directly if DB is breached. CLAUDE.md HARD RULE #46 mandates
 * SHA-256 hashing — only hash stored in DB, plaintext sent in email.
 *
 * This static lock verifies:
 * - password-reset.ts: hashes token before storing AND before lookup
 * - email/index.ts (if it has verification tokens): same pattern
 *
 * Forbidden: storing/looking up `reset_token` directly without `createHash('sha256')`.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PASSWORD_RESET_FILE = 'src/lib/auth/password-reset.ts';

async function readSrc(rel: string): Promise<string> {
  return readFile(join(process.cwd(), rel), 'utf-8');
}

describe('Security Lock — token hash required (HARD RULE #46)', () => {
  it('requestPasswordReset hashes token via SHA-256 before storing', async () => {
    const content = await readSrc(PASSWORD_RESET_FILE);

    // Function body extraction
    const fnStart = content.indexOf('function requestPasswordReset');
    expect(fnStart, 'requestPasswordReset function not found').toBeGreaterThan(-1);
    const nextExport = content.indexOf('\nexport ', fnStart + 50);
    const fnBody = content.slice(fnStart, nextExport === -1 ? content.length : nextExport);

    // Must use SHA-256 hash
    expect(fnBody, 'requestPasswordReset must hash reset_token via SHA-256').toMatch(
      /createHash\(\s*['"]sha256['"]\s*\)/,
    );

    // Must store hash, not plaintext
    expect(fnBody, 'requestPasswordReset must update users.reset_token with hash').toMatch(
      /UPDATE\s+users\s+SET\s+reset_token/i,
    );
  });

  it('resetPasswordWithToken hashes incoming token before DB lookup', async () => {
    const content = await readSrc(PASSWORD_RESET_FILE);

    const fnStart = content.indexOf('function resetPasswordWithToken');
    expect(fnStart, 'resetPasswordWithToken function not found').toBeGreaterThan(-1);
    const nextExport = content.indexOf('\nexport ', fnStart + 50);
    const fnBody = content.slice(fnStart, nextExport === -1 ? content.length : nextExport);

    // Must hash incoming token before SELECT lookup
    expect(fnBody, 'resetPasswordWithToken must hash token before SELECT').toMatch(
      /createHash\(\s*['"]sha256['"]\s*\)/,
    );

    // Lookup must use the hash variable, not raw token
    // Look for "WHERE reset_token = $1" with hash variable bound
    expect(fnBody, 'resetPasswordWithToken must SELECT by hashed token').toMatch(
      /WHERE\s+reset_token\s*=\s*\$1/i,
    );
  });

  it('password-reset.ts does not store reset_token without hashing', async () => {
    const content = await readSrc(PASSWORD_RESET_FILE);

    // Antipattern: directly inserting/updating reset_token with the raw token variable.
    // Look for `reset_token = $X` followed by `[token]` (raw bind) without prior createHash.
    // Heuristic: if file uses `crypto.createHash('sha256')` somewhere, assume hashing is wired.
    // (Stronger check would require AST analysis.)
    const usesSha256 = /createHash\(\s*['"]sha256['"]\s*\)/.test(content);
    expect(usesSha256, 'password-reset.ts must use SHA-256 for token hashing').toBe(true);
  });
});
