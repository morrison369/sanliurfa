/**
 * Feature flags system — PostgreSQL backed
 */

import { query, queryOne } from '../postgres';

export type FlagType = 'boolean' | 'percentage' | 'user' | 'group';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  type: FlagType;
  value: boolean | number | string[];
  defaultValue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserContext {
  userId?: string;
  groups?: string[];
}

// Ensure the feature_flags table exists (idempotent)
async function ensureTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(20) NOT NULL DEFAULT 'boolean',
      value JSONB NOT NULL DEFAULT 'false',
      default_value BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

function rowToFlag(r: any): FeatureFlag {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    type: r.type as FlagType,
    value: r.value,
    defaultValue: r.default_value,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function initFeatureFlags(): Promise<void> {
  await ensureTable();
  // Seed defaults if table is empty
  const count = await queryOne(`SELECT COUNT(*) as c FROM feature_flags`);
  if (parseInt(count?.c || '0') === 0) {
    await query(`
      INSERT INTO feature_flags (key, name, type, value, default_value) VALUES
        ('new_search', 'New Search Interface', 'percentage', '50', false),
        ('dark_mode', 'Dark Mode', 'boolean', 'true', true)
      ON CONFLICT (key) DO NOTHING
    `);
  }
}

export async function isEnabled(key: string, context?: UserContext): Promise<boolean> {
  try {
    const row = await queryOne(`SELECT type, value, default_value FROM feature_flags WHERE key = $1`, [key]);
    if (!row) return false;

    switch (row.type as FlagType) {
      case 'boolean':
        return row.value === true || row.value === 'true';
      case 'percentage':
        return checkPercentage(Number(row.value), context?.userId);
      case 'user':
        return context?.userId ? (row.value as string[]).includes(context.userId) : false;
      case 'group':
        return context?.groups?.some((g) => (row.value as string[]).includes(g)) ?? false;
      default:
        return Boolean(row.default_value);
    }
  } catch {
    return false;
  }
}

function checkPercentage(percentage: number, userId?: string): boolean {
  if (!userId) return Math.random() * 100 < percentage;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 100 < percentage;
}

export async function getAllFlags(context?: UserContext): Promise<Record<string, boolean>> {
  const flags = await listFlags();
  const result: Record<string, boolean> = {};
  for (const flag of flags) {
    result[flag.key] = await isEnabled(flag.key, context);
  }
  return result;
}

export async function listFlags(): Promise<FeatureFlag[]> {
  await ensureTable();
  const result = await query(`SELECT * FROM feature_flags ORDER BY created_at ASC`);
  return result.rows.map(rowToFlag);
}

export async function getFlagStats(): Promise<{ total: number; enabled: number; disabled: number }> {
  await ensureTable();
  const result = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN (value::text = 'true' OR type = 'percentage') THEN 1 END) as enabled
    FROM feature_flags
  `);
  const row = result.rows[0];
  const total = parseInt(row?.total || '0');
  const enabled = parseInt(row?.enabled || '0');
  return { total, enabled, disabled: total - enabled };
}

export async function updateFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | null> {
  await ensureTable();
  const set: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (updates.name !== undefined) { set.push(`name = $${i++}`); params.push(updates.name); }
  if (updates.description !== undefined) { set.push(`description = $${i++}`); params.push(updates.description); }
  if (updates.type !== undefined) { set.push(`type = $${i++}`); params.push(updates.type); }
  if (updates.value !== undefined) { set.push(`value = $${i++}`); params.push(JSON.stringify(updates.value)); }
  if (updates.defaultValue !== undefined) { set.push(`default_value = $${i++}`); params.push(updates.defaultValue); }

  if (set.length === 0) return null;
  set.push(`updated_at = NOW()`);
  params.push(key);

  const result = await query(
    `UPDATE feature_flags SET ${set.join(', ')} WHERE key = $${i} RETURNING *`,
    params
  );
  return result.rows[0] ? rowToFlag(result.rows[0]) : null;
}

export async function deleteFlag(key: string): Promise<boolean> {
  await ensureTable();
  const result = await query(`DELETE FROM feature_flags WHERE key = $1`, [key]);
  return (result.rowCount ?? 0) > 0;
}

export async function createFlag(
  key: string,
  name: string,
  type: FlagType,
  value: boolean | number | string[]
): Promise<FeatureFlag> {
  await ensureTable();
  const result = await query(
    `INSERT INTO feature_flags (key, name, type, value, default_value)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, value = EXCLUDED.value, updated_at = NOW()
     RETURNING *`,
    [key, name, type, JSON.stringify(value), false]
  );
  return rowToFlag(result.rows[0]);
}
