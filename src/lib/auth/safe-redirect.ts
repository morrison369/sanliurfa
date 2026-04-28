/**
 * Safe Redirect Helper — HARD RULE #32 (open redirect defense)
 *
 * Validates that a redirect target is a same-origin path. Rejects:
 *   - Absolute URLs to other origins (`https://evil.com/...`)
 *   - Protocol-relative URLs (`//evil.com/path`)
 *   - URLs with backslash tricks (`/\evil.com`)
 *   - Non-string / null / empty inputs
 *
 * Always returns a path that is safe to pass to `Astro.redirect()` or HTTP `Location`
 * header. If validation fails, returns the provided fallback (default `/`).
 *
 * Usage:
 *   const target = safeRedirectTarget(Astro.url.searchParams.get('redirect'));
 *   return Astro.redirect(target);
 */

const FALLBACK_DEFAULT = '/';

export function safeRedirectTarget(
  candidate: string | null | undefined,
  fallback: string = FALLBACK_DEFAULT,
): string {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return fallback;
  }

  // Reject protocol-relative URLs (`//evil.com/path`) and backslash variants
  // (some browsers normalize `/\evil.com` to `//evil.com`).
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return fallback;
  }

  // Reject absolute URLs (`http://`, `https://`, `javascript:`, `data:`, etc.).
  // Path must start with a single forward slash.
  if (!candidate.startsWith('/')) {
    return fallback;
  }

  // Defense-in-depth: reject control characters that could break header parsing
  // (CR/LF injection in `Location:` header).
  if (/[\r\n\0]/.test(candidate)) {
    return fallback;
  }

  return candidate;
}
