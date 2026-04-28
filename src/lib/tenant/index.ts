/**
 * Multi-Tenant Support Module
 * Isolate data and configuration per tenant/organization
 */

import { query } from '../postgres';
import type { APIContext } from 'astro';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status: 'active' | 'suspended' | 'inactive';
  plan: 'free' | 'basic' | 'professional' | 'enterprise';
  settings: TenantSettings;
  branding: TenantBranding;
  features: string[];
  limits: TenantLimits;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  defaultLanguage: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  allowPublicRegistration: boolean;
  requireApproval: boolean;
  maxUsers?: number;
  maxPlaces?: number;
  maxStorageMb?: number;
}

export interface TenantBranding {
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customCss?: string;
  customDomain?: string;
}

export interface TenantLimits {
  users: number;
  places: number;
  reviews: number;
  storageMb: number;
  apiCalls: number;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}

// AsyncLocalStorage for tenant context (Node.js 14.8+)
let tenantContext: any;
try {
  const { AsyncLocalStorage } = require('async_hooks');
  tenantContext = new AsyncLocalStorage();
} catch {
  // Fallback for older Node versions
  tenantContext = {
    run: (_: string, fn: Function) => fn(),
    getStore: () => undefined,
  };
}

const TENANT_HEADER = 'x-tenant-id';
const TENANT_COOKIE = 'tenant';

/**
 * Get tenant from request context
 */
export function getTenantFromContext(context: APIContext): string | undefined {
  // Check header
  const headerTenant = context.request.headers.get(TENANT_HEADER);
  if (headerTenant) return headerTenant;
  
  // Check cookie
  const cookieTenant = context.cookies.get(TENANT_COOKIE)?.value;
  if (cookieTenant) return cookieTenant;
  
  // Check subdomain (e.g., tenant.sanliurfa.com)
  const host = context.url.hostname;
  if (host && host !== 'localhost' && !host.includes('sanliurfa.com')) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      return subdomain;
    }
  }
  
  // Check path (e.g., /t/tenant-id/...)
  const pathMatch = context.url.pathname.match(/^\/t\/([^\/]+)/);
  if (pathMatch) return pathMatch[1];
  
  return undefined;
}

/**
 * Get tenant by ID or slug
 */
export async function getTenant(identifier: string): Promise<Tenant | null> {
  const result = await query(
    `SELECT * FROM tenants 
     WHERE id = $1 OR slug = $1 AND status = 'active'`,
    [identifier]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return mapTenantRow(row);
}

/**
 * Get tenant by custom domain
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const result = await query(
    `SELECT * FROM tenants 
     WHERE branding->>'customDomain' = $1 AND status = 'active'`,
    [domain]
  );
  
  if (result.rows.length === 0) return null;
  
  return mapTenantRow(result.rows[0]);
}

/**
 * Map database row to Tenant object
 */
function mapTenantRow(row: any): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    plan: row.plan,
    settings: row.settings,
    branding: row.branding,
    features: row.features || [],
    limits: row.limits,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Create new tenant
 */
export async function createTenant(
  data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<Tenant> {
  // Check slug uniqueness
  const existing = await query('SELECT id FROM tenants WHERE slug = $1', [data.slug]);
  if (existing.rows.length > 0) {
    throw new Error('Tenant slug already exists');
  }
  
  const result = await query(
    `INSERT INTO tenants (slug, name, description, plan, settings, branding, features, limits, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
     RETURNING *`,
    [
      data.slug,
      data.name,
      data.description,
      data.plan,
      JSON.stringify(data.settings),
      JSON.stringify(data.branding),
      data.features,
      JSON.stringify(data.limits),
    ]
  );
  
  return mapTenantRow(result.rows[0]);
}

/**
 * Update tenant
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Tenant> {
  const sets: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (updates.name) {
    sets.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.status) {
    sets.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.plan) {
    sets.push(`plan = $${paramIndex++}`);
    values.push(updates.plan);
  }
  if (updates.settings) {
    sets.push(`settings = settings || $${paramIndex++}`);
    values.push(JSON.stringify(updates.settings));
  }
  if (updates.branding) {
    sets.push(`branding = branding || $${paramIndex++}`);
    values.push(JSON.stringify(updates.branding));
  }
  if (updates.features) {
    sets.push(`features = $${paramIndex++}`);
    values.push(updates.features);
  }
  if (updates.limits) {
    sets.push(`limits = limits || $${paramIndex++}`);
    values.push(JSON.stringify(updates.limits));
  }
  
  sets.push(`updated_at = NOW()`);
  values.push(tenantId);
  
  const result = await query(
    `UPDATE tenants SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (result.rows.length === 0) {
    throw new Error('Tenant not found');
  }
  
  return mapTenantRow(result.rows[0]);
}

/**
 * Delete tenant (soft delete)
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  await query(
    `UPDATE tenants SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
    [tenantId]
  );
}

/**
 * Add member to tenant
 */
export async function addTenantMember(
  tenantId: string,
  userId: string,
  role: TenantMember['role']
): Promise<TenantMember> {
  const result = await query(
    `INSERT INTO tenant_members (tenant_id, user_id, role, joined_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = $3
     RETURNING *`,
    [tenantId, userId, role]
  );
  
  const row = result.rows[0];
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: new Date(row.joined_at),
  };
}

/**
 * Remove member from tenant
 */
export async function removeTenantMember(
  tenantId: string,
  userId: string
): Promise<void> {
  await query(
    `DELETE FROM tenant_members WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );
}

/**
 * Get tenant members
 */
export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const result = await query(
    `SELECT * FROM tenant_members WHERE tenant_id = $1`,
    [tenantId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: new Date(row.joined_at),
  }));
}

/**
 * Check if user is member of tenant
 */
export async function isTenantMember(
  tenantId: string,
  userId: string
): Promise<{ isMember: boolean; role?: TenantMember['role'] }> {
  const result = await query(
    `SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );
  
  if (result.rows.length === 0) {
    return { isMember: false };
  }
  
  return { isMember: true, role: result.rows[0].role };
}

/**
 * Check tenant limits
 */
export async function checkTenantLimits(
  tenantId: string,
  limitType: keyof TenantLimits
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const tenant = await getTenant(tenantId);
  if (!tenant) throw new Error('Tenant not found');
  
  const limit = tenant.limits[limitType];
  
  let current = 0;
  
  switch (limitType) {
    case 'users':
      const usersResult = await query(
        'SELECT COUNT(*) FROM tenant_members WHERE tenant_id = $1',
        [tenantId]
      );
      current = parseInt(usersResult.rows[0].count);
      break;
    case 'places':
      const placesResult = await query(
        'SELECT COUNT(*) FROM places WHERE tenant_id = $1',
        [tenantId]
      );
      current = parseInt(placesResult.rows[0].count);
      break;
    case 'reviews':
      const reviewsResult = await query(
        `SELECT COUNT(*) FROM reviews r
         JOIN places p ON r.place_id = p.id
         WHERE p.tenant_id = $1`,
        [tenantId]
      );
      current = parseInt(reviewsResult.rows[0].count);
      break;
    case 'storageMb':
      // Would need storage tracking table
      current = 0;
      break;
    case 'apiCalls':
      // Would need API usage tracking
      current = 0;
      break;
  }
  
  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

/**
 * Get tenant context (for use in async operations)
 */
export function getCurrentTenantId(): string | undefined {
  return tenantContext.getStore();
}

/**
 * Run code within tenant context
 */
export function runWithTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return tenantContext.run(tenantId, fn);
}

/**
 * Middleware for tenant resolution
 */
export async function tenantMiddleware(
  context: APIContext,
  next: () => Promise<Response>
): Promise<Response> {
  const tenantId = getTenantFromContext(context);
  
  if (tenantId) {
    const tenant = await getTenant(tenantId);
    
    if (!tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (tenant.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Tenant suspended' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Add tenant to context
    context.locals.tenant = tenant;
    
    // Run in tenant context
    return runWithTenant(tenant.id, next);
  }
  
  return next();
}

/**
 * Get default tenant settings by plan
 */
export function getDefaultSettings(plan: Tenant['plan']): TenantSettings {
  const defaults: Record<Tenant['plan'], TenantSettings> = {
    free: {
      defaultLanguage: 'tr',
      timezone: 'Europe/Istanbul',
      currency: 'TRY',
      dateFormat: 'DD.MM.YYYY',
      allowPublicRegistration: false,
      requireApproval: true,
      maxUsers: 5,
      maxPlaces: 10,
      maxStorageMb: 100,
    },
    basic: {
      defaultLanguage: 'tr',
      timezone: 'Europe/Istanbul',
      currency: 'TRY',
      dateFormat: 'DD.MM.YYYY',
      allowPublicRegistration: true,
      requireApproval: false,
      maxUsers: 20,
      maxPlaces: 50,
      maxStorageMb: 500,
    },
    professional: {
      defaultLanguage: 'tr',
      timezone: 'Europe/Istanbul',
      currency: 'TRY',
      dateFormat: 'DD.MM.YYYY',
      allowPublicRegistration: true,
      requireApproval: false,
      maxUsers: 100,
      maxPlaces: 200,
      maxStorageMb: 2000,
    },
    enterprise: {
      defaultLanguage: 'tr',
      timezone: 'Europe/Istanbul',
      currency: 'TRY',
      dateFormat: 'DD.MM.YYYY',
      allowPublicRegistration: true,
      requireApproval: false,
      maxUsers: undefined, // Unlimited
      maxPlaces: undefined,
      maxStorageMb: 10000,
    },
  };
  
  return defaults[plan];
}

/**
 * Get default limits by plan
 */
export function getDefaultLimits(plan: Tenant['plan']): TenantLimits {
  const defaults: Record<Tenant['plan'], TenantLimits> = {
    free: { users: 5, places: 10, reviews: 100, storageMb: 100, apiCalls: 1000 },
    basic: { users: 20, places: 50, reviews: 1000, storageMb: 500, apiCalls: 10000 },
    professional: { users: 100, places: 200, reviews: 10000, storageMb: 2000, apiCalls: 100000 },
    enterprise: { users: 1000, places: 1000, reviews: 100000, storageMb: 10000, apiCalls: 1000000 },
  };
  
  return defaults[plan];
}

