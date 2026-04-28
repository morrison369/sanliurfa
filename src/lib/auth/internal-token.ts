/**
 * Internal API Token Validation
 *
 * Cron job ve internal service-to-service çağrılar için Bearer token doğrulaması.
 * `INTERNAL_API_TOKEN` env'i set edilmeli; production'da boş bırakılması istek reddedilir
 * (security-by-default — config eksikliği bypass'a dönüşmez).
 *
 * Geriye dönük uyumluluk: legacy `METRICS_API_TOKEN` da kabul edilir.
 */

export interface InternalTokenResult {
  ok: boolean;
  reason?: 'missing_header' | 'invalid_format' | 'no_token_configured' | 'token_mismatch';
}

/**
 * Bearer token'ı `INTERNAL_API_TOKEN` (veya legacy `METRICS_API_TOKEN`) ile doğrular.
 *
 * - Header yoksa veya `Bearer ` prefix'i yoksa → reddet
 * - Hiç token configured değilse → reddet (security-by-default)
 * - Token uyuşmazsa → reddet
 */
export function verifyInternalToken(request: Request): InternalTokenResult {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return { ok: false, reason: 'missing_header' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, reason: 'invalid_format' };
  }

  const provided = authHeader.slice(7).trim();
  const expected = process.env.INTERNAL_API_TOKEN || process.env.METRICS_API_TOKEN;

  if (!expected || expected.trim().length === 0) {
    return { ok: false, reason: 'no_token_configured' };
  }

  if (provided !== expected) {
    return { ok: false, reason: 'token_mismatch' };
  }

  return { ok: true };
}
