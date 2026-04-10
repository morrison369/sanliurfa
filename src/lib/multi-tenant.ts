/**
 * Multi-Tenant Support Library
 * Tenant context, data isolation, white-label features
 */

import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';
import crypto from 'crypto';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description?: string;
  owner_id: string;
  status: string;
  subscription_tier: string;
  custom_domain?: string;
  logo_url?: string;
  favicon_url?: string;
  is_white_label: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantBranding {
  id: string;
  tenant_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  logo_url?: string;
  favicon_url?: string;
  banner_image_url?: string;
  footer_text?: string;
  custom_css?: string;
  hide_branding: boolean;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  permissions: string[];
  joined_at: string;
}

// ===== TENANT FUNCTIONS =====

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const cacheKey = `sanliurfa:tenant:slug:${slug}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const tenant = await queryOne(
      'SELECT * FROM tenants WHERE slug = $1 AND status = $2',
      [slug, 'active']
    );

    if (tenant) {
      await setCache(cacheKey, JSON.stringify(tenant), 3600);
    }

    return tenant;
  } catch (error) {
    logger.error(
      'Failed to get tenant by slug',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  try {
    const cacheKey = `sanliurfa:tenant:domain:${domain}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const tenant = await queryOne(
      'SELECT * FROM tenants WHERE custom_domain = $1 AND status = $2',
      [domain, 'active']
    );

    if (tenant) {
      await setCache(cacheKey, JSON.stringify(tenant), 3600);
    }

    return tenant;
  } catch (error) {
    logger.error(
      'Failed to get tenant by domain',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function createTenant(
  name: string,
  slug: string,
  ownerId: string,
  description?: string
): Promise<Tenant | null> {
  try {
    const tenant = await insert('tenants', {
      name,
      slug,
      owner_id: ownerId,
      description,
      status: 'active',
      created_at: new Date()
    });

    // Create default branding
    await insert('tenant_branding', {
      tenant_id: tenant.id,
      primary_color: '#3B82F6',
      secondary_color: '#1F2937',
      accent_color: '#F59E0B'
    });

    // Create default settings
    await insert('tenant_settings', {
      tenant_id: tenant.id,
      default_language: 'tr',
      timezone: 'Europe/Istanbul'
    });

    // Add owner as member
    await insert('tenant_members', {
      tenant_id: tenant.id,
      user_id: ownerId,
      role: 'owner'
    });

    await deleteCache(`sanliurfa:tenant:slug:${slug}`);
    logger.info('Tenant created', { id: tenant.id, slug });

    return tenant;
  } catch (error) {
    logger.error(
      'Failed to create tenant',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getTenantBranding(tenantId: string): Promise<TenantBranding | null> {
  try {
    const cacheKey = `sanliurfa:branding:${tenantId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const branding = await queryOne(
      'SELECT * FROM tenant_branding WHERE tenant_id = $1',
      [tenantId]
    );

    if (branding) {
      await setCache(cacheKey, JSON.stringify(branding), 3600);
    }

    return branding;
  } catch (error) {
    logger.error(
      'Failed to get tenant branding',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function updateTenantBranding(
  tenantId: string,
  branding: Partial<TenantBranding>
): Promise<boolean> {
  try {
    await update('tenant_branding', { tenant_id: tenantId }, branding);
    await deleteCache(`sanliurfa:branding:${tenantId}`);
    logger.info('Tenant branding updated', { tenantId });
    return true;
  } catch (error) {
    logger.error(
      'Failed to update tenant branding',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

// ===== TENANT MEMBERS =====

export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  try {
    return await queryRows(
      'SELECT * FROM tenant_members WHERE tenant_id = $1 ORDER BY joined_at DESC',
      [tenantId]
    );
  } catch (error) {
    logger.error(
      'Failed to get tenant members',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export async function addTenantMember(
  tenantId: string,
  userId: string,
  role: string = 'member'
): Promise<TenantMember | null> {
  try {
    const member = await insert('tenant_members', {
      tenant_id: tenantId,
      user_id: userId,
      role,
      joined_at: new Date()
    });

    logger.info('Tenant member added', { tenantId, userId, role });
    return member;
  } catch (error) {
    logger.error(
      'Failed to add tenant member',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function removeTenantMember(tenantId: string, userId: string): Promise<boolean> {
  try {
    await queryOne(
      'DELETE FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    );

    logger.info('Tenant member removed', { tenantId, userId });
    return true;
  } catch (error) {
    logger.error(
      'Failed to remove tenant member',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

// ===== TENANT FEATURES =====

export async function isTenantFeatureEnabled(
  tenantId: string,
  featureKey: string
): Promise<boolean> {
  try {
    const cacheKey = `sanliurfa:feature:${tenantId}:${featureKey}`;
    let cached = await getCache(cacheKey);

    if (cached !== null) {
      return cached === 'true';
    }

    const feature = await queryOne(
      'SELECT enabled FROM tenant_features WHERE tenant_id = $1 AND feature_key = $2',
      [tenantId, featureKey]
    );

    const enabled = feature?.enabled ?? false;
    await setCache(cacheKey, String(enabled), 1800);

    return enabled;
  } catch (error) {
    logger.error(
      'Failed to check tenant feature',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function setTenantFeature(
  tenantId: string,
  featureKey: string,
  enabled: boolean,
  config?: any
): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT id FROM tenant_features WHERE tenant_id = $1 AND feature_key = $2',
      [tenantId, featureKey]
    );

    if (existing) {
      await update(
        'tenant_features',
        { tenant_id: tenantId, feature_key: featureKey },
        { enabled, config, updated_at: new Date() }
      );
    } else {
      await insert('tenant_features', {
        tenant_id: tenantId,
        feature_key: featureKey,
        enabled,
        config,
        created_at: new Date()
      });
    }

    await deleteCache(`sanliurfa:feature:${tenantId}:${featureKey}`);
    logger.info('Tenant feature updated', { tenantId, featureKey, enabled });

    return true;
  } catch (error) {
    logger.error(
      'Failed to set tenant feature',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

// ===== TENANT API KEYS =====

export async function createTenantApiKey(
  tenantId: string,
  name: string,
  permissions?: string[]
): Promise<string | null> {
  try {
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await insert('tenant_api_keys', {
      tenant_id: tenantId,
      key_hash: keyHash,
      name,
      permissions: permissions || [],
      rate_limit_per_hour: 1000,
      created_at: new Date()
    });

    logger.info('Tenant API key created', { tenantId, name });

    return rawKey;
  } catch (error) {
    logger.error(
      'Failed to create tenant API key',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function validateTenantApiKey(
  tenantId: string,
  key: string
): Promise<boolean> {
  try {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await queryOne(
      `SELECT id FROM tenant_api_keys
       WHERE tenant_id = $1 AND key_hash = $2
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [tenantId, keyHash]
    );

    if (apiKey) {
      // Update last_used_at
      await update('tenant_api_keys', { key_hash: keyHash }, { last_used_at: new Date() });
      return true;
    }

    return false;
  } catch (error) {
    logger.error(
      'Failed to validate tenant API key',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

// ===== AUDIT LOGGING =====

export async function logTenantAudit(
  tenantId: string,
  userId: string | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  changes?: any,
  ipAddress?: string
): Promise<boolean> {
  try {
    await insert('tenant_audit_logs', {
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes,
      ip_address: ipAddress,
      created_at: new Date()
    });

    return true;
  } catch (error) {
    logger.error(
      'Failed to log tenant audit',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function getTenantAuditLogs(
  tenantId: string,
  limit: number = 100
): Promise<any[]> {
  try {
    return await queryRows(
      'SELECT * FROM tenant_audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2',
      [tenantId, limit]
    );
  } catch (error) {
    logger.error(
      'Failed to get tenant audit logs',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

// ===== DATA ISOLATION =====

export function buildTenantQuery(baseQuery: string, tenantId: string, paramIndex: number = 1): {
  query: string;
  params: string[];
} {
  // Helper to inject tenant isolation into queries
  // Usage: buildTenantQuery("SELECT * FROM places WHERE category = $1", tenantId, 1)
  // Results in: "SELECT * FROM places WHERE tenant_id = $1 AND category = $2"

  const placeholder = `$${paramIndex}`;
  const tenantPlaceholder = `$${paramIndex + 1}`;

  let modifiedQuery = baseQuery;

  // If query has WHERE, add AND
  if (baseQuery.includes('WHERE')) {
    modifiedQuery = baseQuery.replace('WHERE ', `WHERE tenant_id = ${tenantPlaceholder} AND `);
  } else {
    // Add WHERE clause
    modifiedQuery = baseQuery + ` WHERE tenant_id = ${tenantPlaceholder}`;
  }

  return {
    query: modifiedQuery,
    params: [tenantId]
  };
}
