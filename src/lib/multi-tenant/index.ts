/**
 * Multi-tenant Architecture Module
 * Tenant isolation, quotas, and management
 */

import { query } from '../postgres';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'free' | 'basic' | 'professional' | 'enterprise';
  settings: TenantSettings;
  quotas: TenantQuotas;
  usage: TenantUsage;
  createdAt: Date;
  expiresAt?: Date;
}

export interface TenantSettings {
  branding?: {
    logo?: string;
    primaryColor?: string;
    favicon?: string;
  };
  features?: string[];
  customization?: Record<string, any>;
}

export interface TenantQuotas {
  maxUsers: number;
  maxPlaces: number;
  maxStorage: number; // MB
  maxApiCalls: number; // per day
  maxEmails: number; // per day
}

export interface TenantUsage {
  users: number;
  places: number;
  storage: number; // MB
  apiCalls: number; // today
  emails: number; // today
}

// Current tenant context
let currentTenantId: string | null = null;

/**
 * Set current tenant context
 */
export function setCurrentTenant(tenantId: string): void {
  currentTenantId = tenantId;
}

/**
 * Get current tenant ID
 */
export function getCurrentTenant(): string | null {
  return currentTenantId;
}

/**
 * Get tenant by ID
 */
export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const result = await query(
    `SELECT * FROM tenants WHERE id = $1`,
    [tenantId]
  );
  return result.rows[0] || null;
}

/**
 * Get tenant by domain
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const result = await query(
    `SELECT * FROM tenants WHERE domain = $1 OR slug = $1`,
    [domain]
  );
  return result.rows[0] || null;
}

/**
 * Create new tenant
 */
export async function createTenant(
  data: Omit<Tenant, 'id' | 'createdAt' | 'usage'>
): Promise<Tenant> {
  // Check if slug is available
  const existing = await query(
    `SELECT id FROM tenants WHERE slug = $1`,
    [data.slug]
  );
  
  if (existing.rows.length > 0) {
    throw new Error('Tenant slug already exists');
  }

  const defaultQuotas: Record<string, TenantQuotas> = {
    free: { maxUsers: 3, maxPlaces: 10, maxStorage: 100, maxApiCalls: 1000, maxEmails: 100 },
    basic: { maxUsers: 10, maxPlaces: 50, maxStorage: 1000, maxApiCalls: 10000, maxEmails: 1000 },
    professional: { maxUsers: 50, maxPlaces: 200, maxStorage: 10000, maxApiCalls: 100000, maxEmails: 10000 },
    enterprise: { maxUsers: -1, maxPlaces: -1, maxStorage: 100000, maxApiCalls: 1000000, maxEmails: 100000 }
  };

  const quotas = data.quotas || defaultQuotas[data.plan];

  const result = await query(
    `INSERT INTO tenants (name, slug, domain, status, plan, settings, quotas, usage)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.name, data.slug, data.domain, data.status, data.plan,
     JSON.stringify(data.settings), JSON.stringify(quotas), JSON.stringify({ users: 0, places: 0, storage: 0, apiCalls: 0, emails: 0 })]
  );

  return result.rows[0];
}

/**
 * Update tenant
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<Tenant>
): Promise<Tenant | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.plan) {
    fields.push(`plan = $${paramIndex++}`);
    values.push(updates.plan);
  }
  if (updates.settings) {
    fields.push(`settings = $${paramIndex++}`);
    values.push(JSON.stringify(updates.settings));
  }
  if (updates.quotas) {
    fields.push(`quotas = $${paramIndex++}`);
    values.push(JSON.stringify(updates.quotas));
  }

  if (fields.length === 0) return null;

  values.push(tenantId);

  const result = await query(
    `UPDATE tenants SET ${fields.join(', ')}, updated_at = NOW() 
     WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete tenant
 */
export async function deleteTenant(tenantId: string): Promise<boolean> {
  // Soft delete - mark as deleted
  const result = await query(
    `UPDATE tenants SET status = 'deleted', deleted_at = NOW() WHERE id = $1`,
    [tenantId]
  );
  return result.rowCount > 0;
}

/**
 * Check if tenant has feature enabled
 */
export async function hasFeature(tenantId: string, feature: string): Promise<boolean> {
  const tenant = await getTenant(tenantId);
  if (!tenant) return false;

  const planFeatures: Record<string, string[]> = {
    free: ['basic_search', 'public_profiles'],
    basic: ['basic_search', 'public_profiles', 'analytics', 'export'],
    professional: ['basic_search', 'public_profiles', 'analytics', 'export', 'api_access', 'advanced_analytics', 'webhooks'],
    enterprise: ['all']
  };

  const features = planFeatures[tenant.plan] || [];
  return features.includes('all') || features.includes(feature);
}

/**
 * Check quota limits
 */
export async function checkQuota(
  tenantId: string,
  resource: keyof TenantQuotas
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const tenant = await getTenant(tenantId);
  if (!tenant) {
    return { allowed: false, current: 0, limit: 0, remaining: 0 };
  }

  const limit = tenant.quotas[resource];
  const current = tenant.usage[resource as keyof TenantUsage] || 0;
  
  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current, limit: -1, remaining: Infinity };
  }

  const remaining = limit - current;
  return { allowed: remaining > 0, current, limit, remaining };
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  tenantId: string,
  resource: keyof TenantUsage,
  amount: number = 1
): Promise<void> {
  await query(
    `UPDATE tenants 
     SET usage = jsonb_set(usage, array[$2], (COALESCE(usage->>$2, '0')::int + $3)::text::jsonb)
     WHERE id = $1`,
    [tenantId, resource, amount]
  );
}

/**
 * Reset daily usage counters
 */
export async function resetDailyUsage(): Promise<void> {
  await query(
    `UPDATE tenants 
     SET usage = jsonb_set(jsonb_set(usage, '{apiCalls}', '0'), '{emails}', '0')`
  );
}

/**
 * Add user to tenant
 */
export async function addUserToTenant(
  tenantId: string,
  userId: string,
  role: string = 'member'
): Promise<void> {
  // HARD RULE #47: Atomic quota check + increment — prevents race condition where
  // two concurrent addUserToTenant calls both pass checkQuota and both increment.
  const quotaResult = await query(
    `UPDATE tenants
     SET usage = jsonb_set(usage, '{users}', ((usage->>'users')::int + 1)::text::jsonb)
     WHERE id = $1
       AND (quotas->>'maxUsers' = '-1'
            OR (usage->>'users')::int < (quotas->>'maxUsers')::int)
     RETURNING id`,
    [tenantId]
  );

  if (quotaResult.rowCount === 0) {
    throw new Error('User quota exceeded');
  }

  await query(
    `INSERT INTO tenant_users (tenant_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = $3`,
    [tenantId, userId, role]
  );
}

/**
 * Remove user from tenant
 */
export async function removeUserFromTenant(
  tenantId: string,
  userId: string
): Promise<void> {
  await query(
    `DELETE FROM tenant_users WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );

  await query(
    `UPDATE tenants 
     SET usage = jsonb_set(usage, '{users}', GREATEST(0, (usage->>'users')::int - 1)::text::jsonb)
     WHERE id = $1`,
    [tenantId]
  );
}

/**
 * Get tenant users
 */
export async function getTenantUsers(tenantId: string): Promise<any[]> {
  const result = await query(
    `SELECT u.*, tu.role, tu.joined_at
     FROM users u
     JOIN tenant_users tu ON u.id = tu.user_id
     WHERE tu.tenant_id = $1`,
    [tenantId]
  );
  return result.rows;
}

/**
 * Get tenant statistics
 */
export async function getTenantStats(tenantId: string): Promise<{
  totalUsers: number;
  activeUsers: number;
  totalPlaces: number;
  totalReviews: number;
  storageUsed: number;
}> {
  const [users, activeUsers, places, reviews] = await Promise.all([
    query(`SELECT COUNT(*) FROM tenant_users WHERE tenant_id = $1`, [tenantId]),
    query(
      `SELECT COUNT(DISTINCT tu.user_id) FROM tenant_users tu
       JOIN audit_logs al ON al.user_id = tu.user_id
       WHERE tu.tenant_id = $1 AND al.created_at > NOW() - INTERVAL '30 days'`,
      [tenantId]
    ),
    query(`SELECT COUNT(*) FROM places WHERE tenant_id = $1`, [tenantId]),
    query(`SELECT COUNT(*) FROM reviews r JOIN places p ON r.place_id = p.id WHERE p.tenant_id = $1`, [tenantId])
  ]);

  return {
    totalUsers: parseInt(users.rows[0].count),
    activeUsers: parseInt(activeUsers.rows[0].count),
    totalPlaces: parseInt(places.rows[0].count),
    totalReviews: parseInt(reviews.rows[0].count),
    storageUsed: 0, // Calculated via filesystem du — not available in DB
  };
}

/**
 * Middleware to set tenant context from request
 */
export async function tenantMiddleware(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const host = url.hostname;

  // Try to get tenant from subdomain
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'www') {
    const tenant = await getTenantByDomain(subdomain);
    if (tenant) {
      setCurrentTenant(tenant.id);
      return tenant.id;
    }
  }

  // Try to get tenant from header
  const tenantId = request.headers.get('x-tenant-id');
  if (tenantId) {
    setCurrentTenant(tenantId);
    return tenantId;
  }

  return null;
}

/**
 * Get all tenants (admin only)
 */
export async function getAllTenants(
  options: { status?: string; plan?: string; limit?: number; offset?: number } = {}
): Promise<{ tenants: Tenant[]; total: number }> {
  let sql = `SELECT * FROM tenants WHERE 1=1`;
  let countSql = `SELECT COUNT(*) FROM tenants WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (options.status) {
    sql += ` AND status = $${paramIndex}`;
    countSql += ` AND status = $${paramIndex}`;
    params.push(options.status);
    paramIndex++;
  }

  if (options.plan) {
    sql += ` AND plan = $${paramIndex}`;
    countSql += ` AND plan = $${paramIndex}`;
    params.push(options.plan);
    paramIndex++;
  }

  sql += ` ORDER BY created_at DESC`;

  if (options.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }

  if (options.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(options.offset);
  }

  const [tenantsResult, countResult] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, paramIndex - (options.limit ? 1 : 0) - (options.offset ? 1 : 0)))
  ]);

  return {
    tenants: tenantsResult.rows,
    total: parseInt(countResult.rows[0].count)
  };
}
