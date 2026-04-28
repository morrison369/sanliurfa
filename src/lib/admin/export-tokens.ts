import crypto from 'node:crypto';
import { query, queryOne } from '../postgres';
import { checkRateLimit, getCache, setCache } from '../cache/cache';

export type ExportResourceKey =
  | 'admin.social.events.export'
  | 'admin.places.lifecycle.export'
  | 'admin.reports.social-lifecycle';

type ExportTokenPayload = Record<string, unknown>;
type ExportTokenPolicy = {
  allowedIpCidrs?: string[];
  allowedCountries?: string[];
  replayProtection?: boolean;
};
export type ExportTokenRow = {
  id: string;
  resource_key: ExportResourceKey;
  expires_at: string;
  max_downloads: number;
  used_count: number;
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  bound_ip: string | null;
  bound_user_agent: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  payload?: Record<string, unknown> | null;
};

function getSecret(): string {
  const secret = process.env.EXPORT_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('EXPORT_TOKEN_SECRET veya JWT_SECRET env değişkeni tanımlanmamış');
  }
  return secret;
}

function hashToken(token: string): string {
  return crypto.createHmac('sha256', getSecret()).update(token).digest('hex');
}

function makeFingerprint(tokenHash: string, requestIp: string | null | undefined, userAgent: string | null | undefined): string {
  const base = `${tokenHash}:${normalizeIp(String(requestIp || 'unknown'))}:${String(userAgent || 'unknown')}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}

function normalizeIp(input: string): string {
  return input.trim().replace(/^\[|\]$/g, '').replace(/:\d+$/, '');
}

function isPrivateIpv4(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('127.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function parseIpv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((x) => Number(x));
  if (nums.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  return ((nums[0] << 24) >>> 0) + ((nums[1] << 16) >>> 0) + ((nums[2] << 8) >>> 0) + (nums[3] >>> 0);
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, prefixStr] = cidr.split('/');
  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const ipInt = parseIpv4ToInt(ip);
  const baseInt = parseIpv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export async function issueExportToken(input: {
  resourceKey: ExportResourceKey;
  payload?: ExportTokenPayload;
  ttlSeconds?: number;
  maxDownloads?: number;
  createdBy?: string | null;
  boundIp?: string | null;
  boundUserAgent?: string | null;
  allowedIpCidrs?: string[];
  allowedCountries?: string[];
  replayProtection?: boolean;
}): Promise<{ token: string; expiresAt: string; ttlSeconds: number; maxDownloads: number }> {
  const ttlSeconds = Math.max(30, Math.min(3600, Number(input.ttlSeconds || 300)));
  const maxDownloads = Math.max(1, Math.min(20, Number(input.maxDownloads || 1)));
  const token = crypto.randomBytes(24).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const policy: ExportTokenPolicy = {
    allowedIpCidrs: Array.isArray(input.allowedIpCidrs)
      ? input.allowedIpCidrs.map((x) => String(x).trim()).filter(Boolean)
      : undefined,
    allowedCountries: Array.isArray(input.allowedCountries)
      ? input.allowedCountries.map((x) => String(x).trim().toUpperCase()).filter(Boolean)
      : undefined,
    replayProtection: input.replayProtection !== false,
  };
  const payload = {
    ...(input.payload || {}),
    __tokenPolicy: policy,
  };

  await query(
    `INSERT INTO admin_export_tokens (
      token_hash, resource_key, payload, expires_at, max_downloads, created_by, bound_ip, bound_user_agent
    ) VALUES ($1, $2, $3::jsonb, $4::timestamptz, $5, $6, $7, $8)`,
    [
      tokenHash,
      input.resourceKey,
      JSON.stringify(payload),
      expiresAt,
      maxDownloads,
      input.createdBy || null,
      input.boundIp || null,
      input.boundUserAgent || null,
    ],
  );

  return { token, expiresAt, ttlSeconds, maxDownloads };
}

export async function consumeExportToken(input: {
  token: string;
  resourceKey: ExportResourceKey;
  requestIp?: string | null;
  userAgent?: string | null;
  requestCountry?: string | null;
}): Promise<{ ok: true; payload: ExportTokenPayload; riskFlags: string[] } | { ok: false; reason: string }> {
  if (!input.token) return { ok: false, reason: 'token_missing' };
  const tokenHash = hashToken(input.token);
  const failOpenAllowed = await checkRateLimit(`export-token-lockout:${tokenHash}`, 7, 600);
  if (!failOpenAllowed) return { ok: false, reason: 'token_locked_too_many_attempts' };
  const row = await queryOne<{
    id: string;
    resource_key: string;
    payload: Record<string, unknown>;
    expires_at: string;
    max_downloads: number;
    used_count: number;
    bound_ip?: string | null;
    bound_user_agent?: string | null;
    revoked_at?: string | null;
  }>(
    `SELECT id, resource_key, payload, expires_at, max_downloads, used_count, bound_ip, bound_user_agent, revoked_at
     FROM admin_export_tokens
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash],
  );

  if (!row) {
    await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
    return { ok: false, reason: 'token_not_found' };
  }
  if (row.revoked_at) {
    await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
    return { ok: false, reason: 'token_revoked' };
  }
  if (row.resource_key !== input.resourceKey) {
    await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
    return { ok: false, reason: 'token_resource_mismatch' };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
    return { ok: false, reason: 'token_expired' };
  }
  if (Number(row.used_count || 0) >= Number(row.max_downloads || 1)) {
    await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
    return { ok: false, reason: 'token_download_limit' };
  }
  if (row.bound_ip) {
    if (!input.requestIp) {
      await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
      return { ok: false, reason: 'token_ip_missing' };
    }
    if (row.bound_ip !== input.requestIp) {
      await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
      return { ok: false, reason: 'token_ip_mismatch' };
    }
  }
  if (row.bound_user_agent) {
    if (!input.userAgent) {
      await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
      return { ok: false, reason: 'token_ua_missing' };
    }
    if (row.bound_user_agent !== input.userAgent) {
      await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
      return { ok: false, reason: 'token_ua_mismatch' };
    }
  }

  const payload = (row.payload || {}) as ExportTokenPayload;
  const policy = (payload.__tokenPolicy || {}) as ExportTokenPolicy;
  const riskFlags: string[] = [];
  const normalizedIp = input.requestIp ? normalizeIp(String(input.requestIp)) : '';
  const normalizedCountry = String(input.requestCountry || '').trim().toUpperCase();
  if (policy.allowedIpCidrs?.length) {
    if (!normalizedIp) {
      await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
      return { ok: false, reason: 'token_policy_ip_missing' };
    }
    const matched = policy.allowedIpCidrs.some((cidr) => ipv4InCidr(normalizedIp, cidr));
    if (!matched) {
      await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
      return { ok: false, reason: 'token_policy_ip_not_allowed' };
    }
  }
  if (normalizedIp && isPrivateIpv4(normalizedIp)) {
    riskFlags.push('private_ip');
  }
  if (policy.allowedCountries?.length) {
    if (!normalizedCountry) {
      riskFlags.push('country_missing');
    } else if (!policy.allowedCountries.includes(normalizedCountry)) {
      riskFlags.push('country_mismatch');
    }
  }
  const replayProtection = policy.replayProtection !== false;
  if (replayProtection) {
    const fp = makeFingerprint(tokenHash, input.requestIp, input.userAgent);
    const replayKey = `export-token-fp:${fp}`;
    const seen = await getCache<boolean>(replayKey);
    if (seen) {
      await checkRateLimit(`export-token-fail:${tokenHash}`, 5, 600);
      return { ok: false, reason: 'token_replay_detected' };
    }
    const ttlSeconds = Math.max(
      60,
      Math.min(3600, Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000)),
    );
    await setCache(replayKey, true, ttlSeconds);
  }

  await query(
    `UPDATE admin_export_tokens
     SET used_count = used_count + 1,
         last_used_at = NOW()
     WHERE id = $1`,
    [row.id],
  );

  return { ok: true, payload, riskFlags };
}

export async function revokeExportToken(input: {
  token: string;
  revokedBy?: string | null;
  reason?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!input.token) return { ok: false, reason: 'token_missing' };
  const tokenHash = hashToken(input.token);
  const result = await query(
    `UPDATE admin_export_tokens
     SET revoked_at = NOW(),
         revoked_by = $2,
         revoke_reason = $3
     WHERE token_hash = $1
       AND revoked_at IS NULL`,
    [tokenHash, input.revokedBy || null, input.reason || null],
  );
  return { ok: (result.rowCount || 0) > 0, reason: (result.rowCount || 0) > 0 ? undefined : 'token_not_found_or_revoked' };
}

export async function revokeExportTokenById(input: {
  tokenId: string;
  revokedBy?: string | null;
  reason?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!input.tokenId) return { ok: false, reason: 'token_id_missing' };
  const result = await query(
    `UPDATE admin_export_tokens
     SET revoked_at = NOW(),
         revoked_by = $2,
         revoke_reason = $3
     WHERE id = $1
       AND revoked_at IS NULL`,
    [input.tokenId, input.revokedBy || null, input.reason || null],
  );
  return {
    ok: (result.rowCount || 0) > 0,
    reason: (result.rowCount || 0) > 0 ? undefined : 'token_not_found_or_revoked',
  };
}

export async function listExportTokens(input?: {
  resourceKey?: ExportResourceKey | '';
  activeOnly?: boolean;
  limit?: number;
}): Promise<ExportTokenRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (input?.resourceKey) {
    params.push(input.resourceKey);
    where.push(`resource_key = $${params.length}`);
  }
  if (input?.activeOnly) {
    where.push(`revoked_at IS NULL`);
    where.push(`expires_at > NOW()`);
  }
  const limit = Math.max(1, Math.min(200, Number(input?.limit || 50)));
  params.push(limit);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await query(
    `SELECT
       id, resource_key, expires_at, max_downloads, used_count, created_by, created_at, last_used_at,
       bound_ip, bound_user_agent, revoked_at, revoke_reason, payload
     FROM admin_export_tokens
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params as any[],
  );
  return result.rows as ExportTokenRow[];
}
