/**
 * Data Migration Tools Module
 * Database migrations, data transforms, and seeding
 */

import { query } from '../postgres';

export interface Migration {
  id: string;
  name: string;
  version: string;
  description?: string;
  up: string; // SQL to apply migration
  down: string; // SQL to rollback migration
  checksum: string;
  appliedAt?: Date;
  duration?: number; // milliseconds
}

export interface MigrationResult {
  success: boolean;
  applied: string[];
  failed?: string;
  error?: string;
}

export interface SeedConfig {
  entity: string;
  count: number;
  dependencies?: string[];
  factory: (index: number) => Record<string, any>;
}

/**
 * Get applied migrations
 */
export async function getAppliedMigrations(): Promise<Migration[]> {
  const result = await query(
    `SELECT * FROM schema_migrations ORDER BY applied_at ASC`
  );
  return result.rows;
}

/**
 * Get pending migrations
 */
export async function getPendingMigrations(
  availableMigrations: Migration[]
): Promise<Migration[]> {
  const applied = await getAppliedMigrations();
  const appliedVersions = new Set(applied.map(m => m.version));
  
  return availableMigrations.filter(m => !appliedVersions.has(m.version));
}

/**
 * Run migrations
 */
export async function runMigrations(
  migrations: Migration[],
  options: { target?: string; dryRun?: boolean } = {}
): Promise<MigrationResult> {
  const pending = await getPendingMigrations(migrations);
  
  if (options.target) {
    // Run only up to target version
    const targetIndex = pending.findIndex(m => m.version === options.target);
    if (targetIndex === -1) {
      return { success: false, applied: [], error: 'Target version not found' };
    }
    pending.splice(targetIndex + 1);
  }

  const applied: string[] = [];

  for (const migration of pending) {
    try {
      if (!options.dryRun) {
        const startTime = Date.now();
        
        // Run migration in transaction
        await query('BEGIN');
        
        try {
          await query(migration.up);
          
          await query(
            `INSERT INTO schema_migrations (version, name, checksum, applied_at, duration)
             VALUES ($1, $2, $3, NOW(), $4)`,
            [migration.version, migration.name, migration.checksum, Date.now() - startTime]
          );
          
          await query('COMMIT');
        } catch (error) {
          await query('ROLLBACK');
          throw error;
        }
      }
      
      applied.push(migration.version);
    } catch (error: any) {
      return {
        success: false,
        applied,
        failed: migration.version,
        error: error.message
      };
    }
  }

  return { success: true, applied };
}

/**
 * Rollback migration
 */
export async function rollbackMigration(
  steps: number = 1
): Promise<MigrationResult> {
  const applied = await getAppliedMigrations();
  const toRollback = applied.slice(-steps);
  
  const rolledBack: string[] = [];

  for (const migration of toRollback.reverse()) {
    try {
      await query('BEGIN');
      
      try {
        await query(migration.down);
        
        await query(
          `DELETE FROM schema_migrations WHERE version = $1`,
          [migration.version]
        );
        
        await query('COMMIT');
        rolledBack.push(migration.version);
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        applied: rolledBack,
        failed: migration.version,
        error: error.message
      };
    }
  }

  return { success: true, applied: rolledBack };
}

/**
 * Create migration
 */
export function createMigration(
  name: string,
  up: string,
  down: string
): Migration {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const version = timestamp;
  
  return {
    id: `${timestamp}_${name}`,
    name,
    version,
    up,
    down,
    checksum: generateChecksum(up + down)
  };
}

/**
 * Generate checksum
 */
function generateChecksum(content: string): string {
  // Simple checksum - in production use proper hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Verify migration integrity
 */
export async function verifyMigrations(
  migrations: Migration[]
): Promise<{ valid: boolean; issues: string[] }> {
  const applied = await getAppliedMigrations();
  const issues: string[] = [];

  for (const applied of applied) {
    const available = migrations.find(m => m.version === applied.version);
    if (!available) {
      issues.push(`Migration ${applied.version} is applied but not available`);
    } else if (available.checksum !== applied.checksum) {
      issues.push(`Migration ${applied.version} checksum mismatch - do not modify applied migrations`);
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Seed database
 */
export async function seedDatabase(
  configs: SeedConfig[],
  options: { clear?: boolean; truncate?: boolean } = {}
): Promise<{
  success: boolean;
  seeded: Record<string, number>;
  errors: string[];
}> {
  const seeded: Record<string, number> = {};
  const errors: string[] = [];

  // Sort by dependencies
  const sorted = sortByDependencies(configs);

  for (const config of sorted) {
    try {
      if (options.truncate) {
        await query(`TRUNCATE TABLE ${config.entity} CASCADE`);
      }

      let count = 0;
      for (let i = 0; i < config.count; i++) {
        const data = config.factory(i);
        const fields = Object.keys(data);
        const placeholders = fields.map((_, j) => `$${j + 1}`).join(', ');
        const values = fields.map(f => data[f]);

        await query(
          `INSERT INTO ${config.entity} (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );
        count++;
      }

      seeded[config.entity] = count;
    } catch (error: any) {
      errors.push(`${config.entity}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    seeded,
    errors
  };
}

/**
 * Sort configs by dependencies
 */
function sortByDependencies(configs: SeedConfig[]): SeedConfig[] {
  const sorted: SeedConfig[] = [];
  const visited = new Set<string>();

  function visit(config: SeedConfig) {
    if (visited.has(config.entity)) return;
    
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        const depConfig = configs.find(c => c.entity === dep);
        if (depConfig) visit(depConfig);
      }
    }

    visited.add(config.entity);
    sorted.push(config);
  }

  for (const config of configs) {
    visit(config);
  }

  return sorted;
}

/**
 * Transform data
 */
export async function transformData(
  tableName: string,
  transformer: (row: any) => any,
  options: { batchSize?: number; where?: string } = {}
): Promise<{ transformed: number; errors: number }> {
  const batchSize = options.batchSize || 1000;
  let transformed = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    let sql = `SELECT * FROM ${tableName}`;
    if (options.where) sql += ` WHERE ${options.where}`;
    sql += ` LIMIT $1 OFFSET $2`;

    const result = await query(sql, [batchSize, offset]);
    
    if (result.rows.length === 0) break;

    for (const row of result.rows) {
      try {
        const transformedData = transformer(row);
        if (transformedData) {
          const fields = Object.keys(transformedData).filter(k => k !== 'id');
          const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
          const values = [row.id, ...fields.map(f => transformedData[f])];

          await query(
            `UPDATE ${tableName} SET ${setClause} WHERE id = $1`,
            values
          );
          transformed++;
        }
      } catch (e) {
        errors++;
      }
    }

    offset += batchSize;
  }

  return { transformed, errors };
}

/**
 * Copy data between tables
 */
export async function copyData(
  sourceTable: string,
  targetTable: string,
  columnMapping: Record<string, string>,
  options: { where?: string; transform?: Record<string, (v: any) => any> } = {}
): Promise<{ copied: number }> {
  const sourceColumns = Object.keys(columnMapping);
  const targetColumns = Object.values(columnMapping);

  let sql = `SELECT ${sourceColumns.join(', ')} FROM ${sourceTable}`;
  if (options.where) sql += ` WHERE ${options.where}`;

  const result = await query(sql);

  for (const row of result.rows) {
    // Apply transformations
    const transformedRow: any = {};
    for (const [sourceCol, targetCol] of Object.entries(columnMapping)) {
      let value = row[sourceCol];
      if (options.transform?.[sourceCol]) {
        value = options.transform[sourceCol](value);
      }
      transformedRow[targetCol] = value;
    }

    const placeholders = targetColumns.map((_, i) => `$${i + 1}`).join(', ');
    const values = targetColumns.map(c => transformedRow[c]);

    await query(
      `INSERT INTO ${targetTable} (${targetColumns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  return { copied: result.rowCount };
}

/**
 * Generate seed data factories
 */
export function createFactories() {
  const categories = ['restaurant', 'cafe', 'hotel', 'shopping', 'entertainment'];
  const districts = ['Haliliye', 'Karaköprü', 'Eyyübiye', 'Birecik', 'Siverek'];

  return {
    user: (index: number) => ({
      email: `user${index}@example.com`,
      name: `User ${index}`,
      password_hash: 'hashed_password',
      is_active: true,
      created_at: new Date()
    }),

    place: (index: number) => ({
      name: `Place ${index}`,
      category_id: categories[index % categories.length],
      description: `Description for place ${index}`,
      address: `${index} Main St, ${districts[index % districts.length]}`,
      district: districts[index % districts.length],
      latitude: 37.1590 + (Math.random() - 0.5) * 0.1,
      longitude: 38.7969 + (Math.random() - 0.5) * 0.1,
      status: 'active',
      created_at: new Date()
    }),

    review: (index: number, placeIds: string[], userIds: string[]) => ({
      place_id: placeIds[index % placeIds.length],
      user_id: userIds[index % userIds.length],
      rating: Math.floor(Math.random() * 5) + 1,
      content: `Review content ${index}`,
      created_at: new Date()
    })
  };
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  applied: number;
  pending: number;
  latest?: string;
}> {
  const [appliedResult, latestResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM schema_migrations`),
    query(`SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1`)
  ]);

  return {
    applied: parseInt(appliedResult.rows[0].count),
    pending: 0, // Would need available migrations list
    latest: latestResult.rows[0]?.version
  };
}
