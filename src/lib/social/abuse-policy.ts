import { checkRateLimit } from '../cache/cache';
import { queryOne } from '../postgres';

type SocialAction = 'swipe' | 'follow' | 'message_write' | 'message_read';

type AbuseLimitConfig = {
  limit: number;
  windowSeconds: number;
};

type TenantPolicy = Record<SocialAction, AbuseLimitConfig>;

const defaultPolicy: TenantPolicy = {
  swipe: { limit: Number(process.env.SOCIAL_RATE_LIMIT_SWIPE || 120), windowSeconds: 60 },
  follow: { limit: Number(process.env.SOCIAL_RATE_LIMIT_FOLLOW || 60), windowSeconds: 60 },
  message_write: { limit: Number(process.env.SOCIAL_RATE_LIMIT_MESSAGE_WRITE || 80), windowSeconds: 60 },
  message_read: { limit: Number(process.env.SOCIAL_RATE_LIMIT_MESSAGE_READ || 240), windowSeconds: 60 },
};

function sanitizeLimitConfig(input: Partial<AbuseLimitConfig> | undefined, fallback: AbuseLimitConfig): AbuseLimitConfig {
  const limit = Number(input?.limit);
  const windowSeconds = Number(input?.windowSeconds);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : fallback.limit,
    windowSeconds:
      Number.isFinite(windowSeconds) && windowSeconds >= 10 ? Math.floor(windowSeconds) : fallback.windowSeconds,
  };
}

function parseTenantPolicyOverrides(): Record<string, Partial<TenantPolicy>> {
  const raw = process.env.SOCIAL_ABUSE_TENANT_POLICY_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, Partial<TenantPolicy>>;
  } catch {
    return {};
  }
}

export function resolveTenantId(request: Request): string {
  const headerValue = request.headers.get('x-tenant-id')?.trim();
  if (headerValue) return headerValue;
  const host = request.headers.get('host')?.trim() || '';
  const subdomain = host.split('.')[0] || '';
  if (subdomain && !['localhost', '127', 'www'].includes(subdomain)) return subdomain;
  return 'default';
}

export function getTenantSocialPolicy(tenantId: string, role?: string | null): TenantPolicy {
  const overrides = parseTenantPolicyOverrides();
  const tenantConfig = overrides[tenantId] || overrides.default || {};
  const policy: TenantPolicy = {
    swipe: sanitizeLimitConfig(tenantConfig.swipe, defaultPolicy.swipe),
    follow: sanitizeLimitConfig(tenantConfig.follow, defaultPolicy.follow),
    message_write: sanitizeLimitConfig(tenantConfig.message_write, defaultPolicy.message_write),
    message_read: sanitizeLimitConfig(
      (tenantConfig as Partial<Record<'message_read', Partial<AbuseLimitConfig>>>).message_read,
      defaultPolicy.message_read,
    ),
  };

  // Moderatör/admin rollerine operasyonel tolerans
  if (role === 'admin' || role === 'moderator') {
    return {
      swipe: { ...policy.swipe, limit: Math.max(policy.swipe.limit, 400) },
      follow: { ...policy.follow, limit: Math.max(policy.follow.limit, 300) },
      message_write: { ...policy.message_write, limit: Math.max(policy.message_write.limit, 300) },
      message_read: { ...policy.message_read, limit: Math.max(policy.message_read.limit, 600) },
    };
  }
  return policy;
}

async function getTenantSocialPolicyFromDb(tenantId: string): Promise<TenantPolicy | null> {
  try {
    const row = await queryOne<{
      swipe_limit: number;
      swipe_window_seconds: number;
      follow_limit: number;
      follow_window_seconds: number;
      message_write_limit: number;
      message_write_window_seconds: number;
      is_active: boolean;
    }>(
      `SELECT
         swipe_limit, swipe_window_seconds,
         follow_limit, follow_window_seconds,
         message_write_limit, message_write_window_seconds,
         is_active
       FROM tenant_social_policies
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenantId],
    );
    if (!row || row.is_active === false) return null;
    return {
      swipe: sanitizeLimitConfig(
        { limit: row.swipe_limit, windowSeconds: row.swipe_window_seconds },
        defaultPolicy.swipe,
      ),
      follow: sanitizeLimitConfig(
        { limit: row.follow_limit, windowSeconds: row.follow_window_seconds },
        defaultPolicy.follow,
      ),
      message_write: sanitizeLimitConfig(
        { limit: row.message_write_limit, windowSeconds: row.message_write_window_seconds },
        defaultPolicy.message_write,
      ),
      // DB şemasında read için ayrı kolon yok; geçici olarak write politikasını kullan.
      message_read: sanitizeLimitConfig(
        { limit: row.message_write_limit, windowSeconds: row.message_write_window_seconds },
        defaultPolicy.message_read,
      ),
    };
  } catch {
    return null;
  }
}

export async function enforceSocialRateLimit(
  request: Request,
  userId: string,
  action: SocialAction,
  role?: string | null,
): Promise<{ allowed: boolean; tenantId: string; policy: AbuseLimitConfig }> {
  const tenantId = resolveTenantId(request);
  const dbPolicy = await getTenantSocialPolicyFromDb(tenantId);
  const basePolicy = (dbPolicy || getTenantSocialPolicy(tenantId, role))[action];
  const userRiskIncidentCount = await getUserRecentSocialAbuseCount(userId);
  const riskMultiplier = resolveUserRiskMultiplier(userRiskIncidentCount, role);
  const policy = {
    limit: Math.max(5, Math.floor(basePolicy.limit * riskMultiplier)),
    windowSeconds: basePolicy.windowSeconds,
  };
  const key = `social:${tenantId}:${action}:${userId}`;
  const allowed = await checkRateLimit(key, policy.limit, policy.windowSeconds);
  return { allowed, tenantId, policy };
}

async function getUserRecentSocialAbuseCount(userId: string): Promise<number> {
  try {
    const row = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM site_change_audit
       WHERE actor_user_id = $1
         AND action = 'social_abuse'
         AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId],
    );
    return Number(row?.count || 0);
  } catch {
    return 0;
  }
}

function resolveUserRiskMultiplier(incidentCount: number, role?: string | null): number {
  if (role === 'admin' || role === 'moderator') return 1;
  if (incidentCount >= 25) return 0.5;
  if (incidentCount >= 10) return 0.7;
  if (incidentCount >= 5) return 0.85;
  return 1;
}
