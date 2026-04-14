/**
 * Advanced Multi-tenancy
 * Task 144: Row-Level Security & Tenant Isolation
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  settings: {
    theme: string;
    features: string[];
    limits: {
      users: number;
      places: number;
      storage: number;
    };
  };
  createdAt: Date;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
}

// Current tenant context (per-request)
let currentContext: TenantContext | null = null;

/**
 * Set tenant context for request
 */
export function setTenantContext(context: TenantContext): void {
  currentContext = context;
}

/**
 * Get current tenant context
 */
export function getTenantContext(): TenantContext | null {
  return currentContext;
}

/**
 * Create new tenant
 */
export async function createTenant(
  name: string,
  domain: string,
  plan: Tenant['plan'] = 'free'
): Promise<Tenant> {
  const tenant: Tenant = {
    id: generateId(),
    name,
    domain,
    plan,
    settings: {
      theme: 'default',
      features: getFeaturesForPlan(plan),
      limits: getLimitsForPlan(plan),
    },
    createdAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO tenants (id, name, domain, plan, settings, created_at)
    VALUES (${tenant.id}, ${tenant.name}, ${tenant.domain}, ${tenant.plan}, ${JSON.stringify(tenant.settings)}, ${tenant.createdAt})
  `);

  // Enable RLS for tenant
  await setupTenantRLS(tenant.id);

  return tenant;
}

/**
 * Get tenant by domain
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const result = await db.execute(sql`SELECT * FROM tenants WHERE domain = ${domain}`);
  if (!result.rows[0]) return null;

  return {
    id: result.rows[0].id,
    name: result.rows[0].name,
    domain: result.rows[0].domain,
    plan: result.rows[0].plan,
    settings: JSON.parse(result.rows[0].settings),
    createdAt: new Date(result.rows[0].created_at),
  };
}

/**
 * Setup Row-Level Security policies
 */
async function setupTenantRLS(tenantId: string): Promise<void> {
  // Create tenant isolation policy
  await db.execute(sql`
    CREATE POLICY tenant_isolation_policy ON places
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::TEXT)
  `);

  // Set tenant ID for session
  await db.execute(sql`SET app.current_tenant = ${tenantId}`);
}

/**
 * Check if within tenant limits
 */
export async function checkTenantLimits(
  tenantId: string,
  resource: 'users' | 'places' | 'storage'
): Promise<boolean> {
  const tenant = await db.execute(sql`SELECT settings FROM tenants WHERE id = ${tenantId}`);
  if (!tenant.rows[0]) return false;

  const settings = JSON.parse(tenant.rows[0].settings);
  const limit = settings.limits[resource];

  let current = 0;
  if (resource === 'places') {
    const count = await db.execute(sql`SELECT COUNT(*) as count FROM places WHERE tenant_id = ${tenantId}`);
    current = parseInt(count.rows[0].count);
  } else if (resource === 'users') {
    const count = await db.execute(sql`SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = ${tenantId}`);
    current = parseInt(count.rows[0].count);
  }

  return current < limit;
}

function getFeaturesForPlan(plan: Tenant['plan']): string[] {
  const features: Record<string, string[]> = {
    free: ['basic_analytics', '5_places'],
    basic: ['basic_analytics', 'unlimited_places', 'email_support'],
    pro: ['advanced_analytics', 'unlimited_places', 'priority_support', 'api_access'],
    enterprise: ['all_features', 'dedicated_support', 'sla', 'custom_integration'],
  };
  return features[plan] || features.free;
}

function getLimitsForPlan(plan: Tenant['plan']): Tenant['settings']['limits'] {
  const limits: Record<string, Tenant['settings']['limits']> = {
    free: { users: 3, places: 5, storage: 1 },
    basic: { users: 10, places: 50, storage: 10 },
    pro: { users: 50, places: 500, storage: 100 },
    enterprise: { users: 1000, places: 10000, storage: 1000 },
  };
  return limits[plan] || limits.free;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
