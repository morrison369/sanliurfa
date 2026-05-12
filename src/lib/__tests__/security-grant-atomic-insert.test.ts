/**
 * Security Regression Lock — Award/Grant Atomic INSERT
 *
 * 2026-04-25 audit'inde `gamification.ts:grantBadgeToUser` check-then-insert
 * pattern kullanıyordu (SELECT then INSERT). Concurrent request iki badge
 * + double points award yapabilirdi.
 *
 * CLAUDE.md HARD RULE #14: `INSERT ... ON CONFLICT DO NOTHING RETURNING id`
 * + `rowCount === 0` skip pattern zorunlu.
 *
 * Bu test STATIC GUARD: grant/award function'larının atomic insert pattern'ini
 * kullandığını doğrular. SELECT-then-INSERT antipattern'ini yakalar.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Award/grant function'ların bulunduğu kritik dosyalar
const GRANT_FILES = [
  'src/lib/gamification/gamification.ts',
];

describe('Security Regression Lock — atomic INSERT in grant functions', () => {
  for (const filePath of GRANT_FILES) {
    it(`${filePath} grant functions use INSERT ON CONFLICT pattern`, async () => {
      const fullPath = join(process.cwd(), filePath);
      const content = await readFile(fullPath, 'utf-8');

      // grantBadgeToUser function'unu lokalize et
      const fnStart = content.indexOf('function grantBadgeToUser');
      if (fnStart === -1) return; // function yoksa skip

      const nextExport = content.indexOf('\nexport ', fnStart + 50);
      const fnBody = content.slice(fnStart, nextExport === -1 ? content.length : nextExport);

      // ON CONFLICT pattern zorunlu
      expect(fnBody, `${filePath} grantBadgeToUser must use INSERT ... ON CONFLICT`).toMatch(
        /ON\s+CONFLICT/i,
      );

      // RETURNING id zorunlu (atomic check)
      expect(fnBody, `${filePath} grantBadgeToUser must use RETURNING id for atomic check`).toMatch(
        /RETURNING\s+id/i,
      );

      // rowCount === 0 check (idempotent skip)
      expect(fnBody, `${filePath} grantBadgeToUser must check rowCount === 0 for idempotent skip`).toMatch(
        /rowCount\s*===\s*0|rowCount\s*<=?\s*0/,
      );

      // Antipattern: SELECT-then-INSERT pattern (eski check-then-insert)
      // Eğer fnBody'de hem SELECT hem INSERT INTO user_badges varsa ve ON CONFLICT yoksa = bug
      const hasSelectBadge = /SELECT[\s\S]+FROM\s+user_badges/i.test(fnBody);
      const hasInsertBadge = /INSERT\s+INTO\s+user_badges/i.test(fnBody);
      const hasOnConflict = /ON\s+CONFLICT/i.test(fnBody);

      if (hasSelectBadge && hasInsertBadge && !hasOnConflict) {
        throw new Error(
          `${filePath} grantBadgeToUser uses check-then-insert antipattern (race condition). ` +
          `Required: INSERT ... ON CONFLICT DO NOTHING RETURNING id`,
        );
      }
    });
  }
});
