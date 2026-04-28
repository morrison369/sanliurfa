/**
 * Static Lock — Open Redirect (HARD RULE #32)
 *
 * Background: User-controlled redirect targets must be validated before use in
 * `Astro.redirect()` or HTTP `Location` header. Otherwise attackers craft
 * `https://sanliurfa.com/giris?redirect=https://evil.com` post-login phishing.
 *
 * Forbidden pattern:
 *   const target = url.searchParams.get('redirect') || '/';
 *   return Astro.redirect(target);  // ❌ user-controlled target
 *
 * Allowed pattern:
 *   import { safeRedirectTarget } from '@/lib/auth/safe-redirect';
 *   const target = safeRedirectTarget(url.searchParams.get('redirect'));
 *   return Astro.redirect(target);  // ✅ validated same-origin path
 *
 * This static lock walks `src/pages/` looking for files that:
 *   1. Read a `redirect`/`returnTo`/`next`/`return` query param
 *   2. Pass that variable into `Astro.redirect()` or `Location:` header
 *   3. Without going through `safeRedirectTarget()` first
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_PAGES = join(process.cwd(), 'src', 'pages');

// Whitelist: legitimate intentional cases. Each entry must include reason.
const ALLOWED_FILES = new Set<string>([
  // Email click tracking — `linkUrl` is the email campaign destination, by design
  // any external URL. Phishing risk is mitigated separately (campaign URLs are
  // admin-curated, not user-submitted).
  'src/pages/api/email/track.ts',
  // OAuth authorize endpoint — `redirect_uri` flows to OAuth provider's allowlist
  // (Google/Facebook validate). Not a same-origin Location header.
  'src/pages/api/auth/oauth/authorize.ts',
  // OAuth Facebook social — same OAuth provider allowlist pattern
  'src/pages/api/auth/social/facebook.ts',
]);

const REDIRECT_PARAM_RE = /searchParams\.get\(['"](?:redirect|returnTo|return|next)['"]\)/;
const REDIRECT_CALL_RE = /(?:Astro\.redirect\(|['"]Location['"]\s*:\s*)(\w+)/g;
const SAFE_HELPER_RE = /safeRedirectTarget\s*\(/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(astro|ts|tsx)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — Open Redirect via query param (HARD RULE #32)', () => {
  const files = walk(SRC_PAGES);

  it('finds at least 50 page/api source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no file uses query-param redirect target without safeRedirectTarget()', () => {
    const violations: string[] = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      if (!REDIRECT_PARAM_RE.test(source)) continue;

      // File reads a redirect query param — must use the safe helper
      if (!SAFE_HELPER_RE.test(source)) {
        violations.push(rel);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} dosya redirect query param'ı safeRedirectTarget() ile validate etmiyor. ` +
        `Open redirect riski (post-login phishing). Use:\n` +
        `  import { safeRedirectTarget } from '@/lib/auth/safe-redirect';\n` +
        `  const target = safeRedirectTarget(url.searchParams.get('redirect'));\n\n` +
        `Affected files:\n` +
        violations.map(v => `  - ${v}`).join('\n')
      );
    }
  });
});
