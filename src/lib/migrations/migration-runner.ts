/**
 * Database migration runner
 * Schema versioning and migration management
 */

import { query, transaction } from '../db/postgres-client';

// Migration types
export type MigrationType = 'schema' | 'data' | 'seed';

// Migration status
export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';

// Migration definition
export interface Migration {
  id: string;
  version: string;
  name: string;
  description?: string;
  type: MigrationType;
  up: () => Promise<void>;
  down: () => Promise<void>;
  checksum: string;
}

// Migration record
export interface MigrationRecord {
  id: string;
  version: string;
  name: string;
  status: MigrationStatus;
  startedAt?: string;
  completedAt?: string;
  checksum: string;
  executedBy?: string;
  error?: string;
  rollbackVersion?: string;
}

// Migration registry
const migrationRegistry: Map<string, Migration> = new Map();

/**
 * Initialize migration system
 */
export async function initMigrations(): Promise<void> {
  logger.info('[Migrations] Initializing migration system...');
  
  // Create migrations table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      version VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      checksum VARCHAR(64) NOT NULL,
      executed_by VARCHAR(255),
      error TEXT,
      rollback_version VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  logger.info('[Migrations] Migration table ready');
}

/**
 * Register a migration
 */
export function registerMigration(
  version: string,
  name: string,
  type: MigrationType,
  up: () => Promise<void>,
  down: () => Promise<void>,
  options?: { description?: string }
): Migration {
  const id = `migration_${version}`;
  const checksum = generateChecksum(`${version}${name}${type}`);
  
  const migration: Migration = {
    id,
    version,
    name,
    description: options?.description,
    type,
    up,
    down,
    checksum,
  };
  
  migrationRegistry.set(version, migration);
  return migration;
}

/**
 * Run all pending migrations
 */
export async function migrate(options?: {
  toVersion?: string;
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  executed: string[];
  failed?: string;
  error?: string;
}> {
  const executed: string[] = [];
  
  try {
    // Get pending migrations
    const pending = await getPendingMigrations();
    
    if (pending.length === 0) {
      logger.info('[Migrations] No pending migrations');
      return { success: true, executed: [] };
    }
    
    logger.info(`[Migrations] ${pending.length} pending migrations found`);
    
    for (const migration of pending) {
      // Check if we should stop at specific version
      if (options?.toVersion && migration.version > options.toVersion) {
        break;
      }
      
      if (options?.dryRun) {
        logger.info(`[Migrations] Would run: ${migration.version} - ${migration.name}`);
        executed.push(migration.version);
        continue;
      }
      
      // Run migration
      const success = await runMigration(migration);
      
      if (success) {
        executed.push(migration.version);
      } else {
        return {
          success: false,
          executed,
          failed: migration.version,
          error: `Migration ${migration.version} failed`,
        };
      }
    }
    
    logger.info(`[Migrations] ${executed.length} migrations completed`);
    return { success: true, executed };
  } catch (error) {
    logger.error('[Migrations] Migration failed:', error);
    return {
      success: false,
      executed,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run single migration
 */
async function runMigration(migration: Migration): Promise<boolean> {
  logger.info(`[Migrations] Running: ${migration.version} - ${migration.name}`);
  
  const startTime = Date.now();
  
  try {
    // Update status to running
    await query(`
      INSERT INTO schema_migrations (id, version, name, status, started_at, checksum)
      VALUES ($1, $2, $3, 'running', NOW(), $4)
      ON CONFLICT (version) DO UPDATE SET
        status = 'running',
        started_at = NOW(),
        error = NULL
    `, [migration.id, migration.version, migration.name, migration.checksum]);
    
    // Run migration in transaction
    await transaction(async (client) => {
      await migration.up();
    });
    
    // Update status to completed
    await query(`
      UPDATE schema_migrations
      SET status = 'completed',
          completed_at = NOW()
      WHERE version = $1
    `, [migration.version]);
    
    const duration = Date.now() - startTime;
    logger.info(`[Migrations] Completed: ${migration.version} (${duration}ms)`);
    
    return true;
  } catch (error) {
    // Update status to failed
    await query(`
      UPDATE schema_migrations
      SET status = 'failed',
          error = $2,
          completed_at = NOW()
      WHERE version = $1
    `, [migration.version, error instanceof Error ? error.message : 'Unknown error']);
    
    logger.error(`[Migrations] Failed: ${migration.version}`, error);
    return false;
  }
}

/**
 * Rollback migrations
 */
export async function rollback(
  options: {
    steps?: number;
    toVersion?: string;
  }
): Promise<{
  success: boolean;
  rolledBack: string[];
  error?: string;
}> {
  const rolledBack: string[] = [];
  
  try {
    let migrationsToRollback: MigrationRecord[];
    
    if (options.toVersion) {
      // Rollback to specific version
      const result = await query<MigrationRecord>(`
        SELECT * FROM schema_migrations
        WHERE status = 'completed'
          AND version > $1
        ORDER BY version DESC
      `, [options.toVersion]);
      migrationsToRollback = result.rows;
    } else {
      // Rollback N steps
      const steps = options.steps || 1;
      const result = await query<MigrationRecord>(`
        SELECT * FROM schema_migrations
        WHERE status = 'completed'
        ORDER BY version DESC
        LIMIT $1
      `, [steps]);
      migrationsToRollback = result.rows;
    }
    
    for (const record of migrationsToRollback) {
      const migration = migrationRegistry.get(record.version);
      if (!migration) {
        logger.warn(`[Migrations] Migration not found: ${record.version}`);
        continue;
      }
      
      logger.info(`[Migrations] Rolling back: ${migration.version}`);
      
      try {
        await transaction(async (client) => {
          await migration.down();
        });
        
        // Update status
        await query(`
          UPDATE schema_migrations
          SET status = 'rolled_back',
              rollback_version = $2
          WHERE version = $1
        `, [migration.version, options.toVersion]);
        
        rolledBack.push(migration.version);
        logger.info(`[Migrations] Rolled back: ${migration.version}`);
      } catch (error) {
        logger.error(`[Migrations] Rollback failed: ${migration.version}`, error);
        return {
          success: false,
          rolledBack,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    
    return { success: true, rolledBack };
  } catch (error) {
    return {
      success: false,
      rolledBack,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pending migrations
 */
async function getPendingMigrations(): Promise<Migration[]> {
  const result = await query<{ version: string }>(`
    SELECT version FROM schema_migrations
    WHERE status IN ('completed', 'running')
  `);
  
  const completedVersions = new Set(result.rows.map(r => r.version));
  
  const pending: Migration[] = [];
  for (const [version, migration] of migrationRegistry) {
    if (!completedVersions.has(version)) {
      pending.push(migration);
    }
  }
  
  // Sort by version
  pending.sort((a, b) => a.version.localeCompare(b.version));
  
  return pending;
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  total: number;
  completed: number;
  pending: number;
  failed: number;
  currentVersion?: string;
}> {
  const result = await query<{
    status: string;
    count: string;
  }>(`
    SELECT status, COUNT(*) as count
    FROM schema_migrations
    GROUP BY status
  `);
  
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.status] = parseInt(row.count);
  }
  
  const currentResult = await query<{ version: string }>(`
    SELECT version FROM schema_migrations
    WHERE status = 'completed'
    ORDER BY version DESC
    LIMIT 1
  `);
  
  return {
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    completed: counts['completed'] || 0,
    pending: (await getPendingMigrations()).length,
    failed: counts['failed'] || 0,
    currentVersion: currentResult.rows[0]?.version,
  };
}

/**
 * Get migration history
 */
export async function getMigrationHistory(
  limit: number = 50
): Promise<MigrationRecord[]> {
  const result = await query<MigrationRecord>(`
    SELECT * FROM schema_migrations
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}

/**
 * Generate checksum for migration
 */
function generateChecksum(content: string): string {
  // Simple hash for demo - use crypto in production
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Verify migration integrity
 */
export async function verifyMigrations(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  const result = await query<MigrationRecord>(`
    SELECT * FROM schema_migrations
    WHERE status IN ('completed', 'failed')
  `);
  
  for (const record of result.rows) {
    const migration = migrationRegistry.get(record.version);
    if (!migration) {
      errors.push(`Migration ${record.version} not found in registry`);
      continue;
    }
    
    if (migration.checksum !== record.checksum) {
      errors.push(`Checksum mismatch for ${record.version}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create migration file template
 */
export function createMigrationTemplate(
  version: string,
  name: string,
  type: MigrationType = 'schema'
): string {
  return `
import { registerMigration } from '../lib/migrations/migration-runner';
import { logger } from '../logging';

export const ${name.replace(/[^a-z0-9]/gi, '_')} = registerMigration(
  '${version}',
  '${name}',
  '${type}',
  async () => {
    // Migration up - implement your changes here
    // Example:
    // await query('CREATE TABLE ...');
  },
  async () => {
    // Migration down - rollback changes here
    // Example:
    // await query('DROP TABLE ...');
  },
  { description: '${name} migration' }
);
`;
}

// Initialize on module load
// initMigrations().catch(console.error);
