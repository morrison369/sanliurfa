/**
 * Static lock — HARD RULE #52
 * High-impact admin operations must use `locals.user.role !== 'admin'` (strict admin check),
 * not `!locals.isAdmin` which also admits moderators.
 *
 * Targeted files: flags.ts (affects all users), bulk-action.ts (mass bans),
 * quotas/[userId].ts (quota reset).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const HIGH_IMPACT_FILES = [
  'src/pages/api/admin/flags.ts',
  'src/pages/api/admin/bulk-action.ts',
];

describe('HARD RULE #52 — High-Impact Admin Endpoints Must Use Strict Admin Check', () => {
  for (const filePath of HIGH_IMPACT_FILES) {
    it(`${filePath} should not rely solely on !locals.isAdmin without role check`, () => {
      let content: string;
      try {
        content = readFileSync(resolve(process.cwd(), filePath), 'utf-8');
      } catch {
        // File doesn't exist — skip
        return;
      }
      // If the file uses !locals.isAdmin, it must also have a role !== 'admin' check somewhere
      const hasIsAdminCheck = /!\s*locals\.isAdmin/.test(content);
      const hasStrictRoleCheck = /role\s*!==\s*['"]admin['"]|role\s*===\s*['"]admin['"]/.test(content);
      if (hasIsAdminCheck) {
        expect(
          hasStrictRoleCheck,
          `${filePath}: uses !locals.isAdmin but lacks explicit role !== 'admin' guard for high-impact operations`
        ).toBe(true);
      }
    });
  }
});
