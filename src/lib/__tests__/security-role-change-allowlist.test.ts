/**
 * Static lock — HARD RULE #53
 * changeRole admin action must validate newRole against an allowlist.
 * Without this, arbitrary role strings (e.g., 'super_admin', 'hacker') can be written to the DB.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('HARD RULE #53 — changeRole Must Use Role Allowlist', () => {
  it('admin/users/[id].ts must define VALID_ROLES and check before changeUserRole', () => {
    const content = readFileSync(
      resolve(process.cwd(), 'src/pages/api/admin/users/[id].ts'),
      'utf-8'
    );
    expect(content, 'VALID_ROLES allowlist must exist').toMatch(/VALID_ROLES/);
    expect(content, 'allowlist must be used before changeUserRole').toMatch(/VALID_ROLES\.has\(newRole\)/);
  });
});
