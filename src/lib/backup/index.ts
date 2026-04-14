/**
 * System Backup & Disaster Recovery Module
 * Automated backups, restoration, and disaster recovery
 */

import { query } from '../postgres';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface BackupConfig {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'partial';
  schedule?: string; // cron expression
  retention: number; // days
  destination: 'local' | 's3' | 'gcs' | 'azure';
  destinationConfig: {
    path?: string;
    bucket?: string;
    region?: string;
    accessKey?: string;
    secretKey?: string;
  };
  tables?: string[]; // for partial backup
  compress: boolean;
  encrypt: boolean;
  encryptionKey?: string;
}

export interface BackupResult {
  id: string;
  configId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  size?: number; // bytes
  checksum?: string;
  path?: string;
  error?: string;
  duration?: number; // seconds
}

/**
 * Create backup configuration
 */
export async function createBackupConfig(
  config: Omit<BackupConfig, 'id'>
): Promise<BackupConfig> {
  const result = await query(
    `INSERT INTO backup_configs (name, type, schedule, retention, destination, destination_config, tables, compress, encrypt, encryption_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [config.name, config.type, config.schedule, config.retention, config.destination,
     JSON.stringify(config.destinationConfig), config.tables,
     config.compress, config.encrypt, config.encryptionKey]
  );

  return result.rows[0];
}

/**
 * Run backup
 */
export async function runBackup(
  configId: string
): Promise<BackupResult> {
  const config = await getBackupConfig(configId);
  if (!config) throw new Error('Backup configuration not found');

  // Create backup record
  const backupRecord = await query(
    `INSERT INTO backups (config_id, status, started_at)
     VALUES ($1, 'running', NOW())
     RETURNING *`,
    [configId]
  );
  const backup = backupRecord.rows[0];

  const startTime = Date.now();

  try {
    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${config.name}_${timestamp}.sql${config.compress ? '.gz' : ''}`;
    const backupPath = path.join(config.destinationConfig.path || '/tmp/backups', filename);

    // Ensure directory exists
    const dir = path.dirname(backupPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Build pg_dump command
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');

    let dumpCmd = `pg_dump "${dbUrl}"`;

    // Add table filter for partial backup
    if (config.type === 'partial' && config.tables?.length) {
      const tableArgs = config.tables.map(t => `-t "${t}"`).join(' ');
      dumpCmd += ` ${tableArgs}`;
    }

    // Add compression
    if (config.compress) {
      dumpCmd += ` | gzip`;
    }

    // Output to file
    dumpCmd += ` > "${backupPath}"`;

    // Execute backup
    await execAsync(dumpCmd);

    // Get file size
    const stats = fs.statSync(backupPath);

    // Calculate checksum
    const { stdout: checksum } = await execAsync(`sha256sum "${backupPath}" | cut -d' ' -f1`);

    // Update backup record
    await query(
      `UPDATE backups 
       SET status = 'completed', 
           completed_at = NOW(),
           size = $1,
           checksum = $2,
           path = $3,
           duration = $4
       WHERE id = $5`,
      [stats.size, checksum.trim(), backupPath, Math.round((Date.now() - startTime) / 1000), backup.id]
    );

    // Clean old backups
    await cleanupOldBackups(configId, config.retention);

    return {
      ...backup,
      status: 'completed',
      completedAt: new Date(),
      size: stats.size,
      checksum: checksum.trim(),
      path: backupPath,
      duration: Math.round((Date.now() - startTime) / 1000)
    };

  } catch (error: any) {
    await query(
      `UPDATE backups 
       SET status = 'failed', error = $1, completed_at = NOW()
       WHERE id = $2`,
      [error.message, backup.id]
    );

    return {
      ...backup,
      status: 'failed',
      error: error.message,
      completedAt: new Date()
    };
  }
}

/**
 * Restore from backup
 */
export async function restoreBackup(
  backupId: string,
  options: { dropExisting?: boolean; targetDatabase?: string } = {}
): Promise<{ success: boolean; error?: string; duration?: number }> {
  const backup = await getBackup(backupId);
  if (!backup) throw new Error('Backup not found');

  if (!fs.existsSync(backup.path!)) {
    return { success: false, error: 'Backup file not found' };
  }

  const startTime = Date.now();

  try {
    const dbUrl = options.targetDatabase || process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');

    let restoreCmd = '';

    // Drop existing data if requested
    if (options.dropExisting) {
      // This is dangerous - only use in development
      console.warn('Dropping existing data...');
    }

    // Build restore command
    if (backup.path?.endsWith('.gz')) {
      restoreCmd = `gunzip -c "${backup.path}" | psql "${dbUrl}"`;
    } else {
      restoreCmd = `psql "${dbUrl}" < "${backup.path}"`;
    }

    // Execute restore
    await execAsync(restoreCmd);

    return {
      success: true,
      duration: Math.round((Date.now() - startTime) / 1000)
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Math.round((Date.now() - startTime) / 1000)
    };
  }
}

/**
 * Get backup config
 */
export async function getBackupConfig(configId: string): Promise<BackupConfig | null> {
  const result = await query(
    `SELECT * FROM backup_configs WHERE id = $1`,
    [configId]
  );
  return result.rows[0] || null;
}

/**
 * Get backup by ID
 */
export async function getBackup(backupId: string): Promise<BackupResult | null> {
  const result = await query(
    `SELECT * FROM backups WHERE id = $1`,
    [backupId]
  );
  return result.rows[0] || null;
}

/**
 * Get backup history
 */
export async function getBackupHistory(
  configId?: string,
  limit: number = 20
): Promise<BackupResult[]> {
  let sql = `SELECT * FROM backups`;
  const params: any[] = [];

  if (configId) {
    sql += ` WHERE config_id = $1`;
    params.push(configId);
  }

  sql += ` ORDER BY started_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Clean up old backups
 */
export async function cleanupOldBackups(
  configId: string,
  retentionDays: number
): Promise<number> {
  const result = await query(
    `SELECT * FROM backups 
     WHERE config_id = $1 
     AND status = 'completed'
     AND started_at < NOW() - INTERVAL '${retentionDays} days'
     ORDER BY started_at DESC
     OFFSET 1`,
    [configId]
  );

  let deleted = 0;
  for (const backup of result.rows) {
    try {
      if (fs.existsSync(backup.path)) {
        fs.unlinkSync(backup.path);
      }
      await query(`DELETE FROM backups WHERE id = $1`, [backup.id]);
      deleted++;
    } catch (e) {
      console.error(`Failed to delete backup ${backup.id}:`, e);
    }
  }

  return deleted;
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupId: string): Promise<{
  valid: boolean;
  checksum?: string;
  currentChecksum?: string;
  error?: string;
}> {
  const backup = await getBackup(backupId);
  if (!backup || !backup.path) {
    return { valid: false, error: 'Backup not found' };
  }

  if (!fs.existsSync(backup.path)) {
    return { valid: false, error: 'Backup file not found' };
  }

  try {
    const { stdout: currentChecksum } = await execAsync(
      `sha256sum "${backup.path}" | cut -d' ' -f1`
    );

    const valid = currentChecksum.trim() === backup.checksum;

    return {
      valid,
      checksum: backup.checksum,
      currentChecksum: currentChecksum.trim()
    };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Schedule automatic backups
 */
export function scheduleBackups(checkIntervalMinutes: number = 5): () => void {
  const interval = setInterval(async () => {
    try {
      // Get due backups
      const configs = await query(
        `SELECT * FROM backup_configs 
         WHERE schedule IS NOT NULL 
         AND (last_run IS NULL OR 
              last_run < NOW() - (schedule::interval))`
      );

      for (const config of configs.rows) {
        await runBackup(config.id);
        await query(
          `UPDATE backup_configs SET last_run = NOW() WHERE id = $1`,
          [config.id]
        );
      }
    } catch (error) {
      console.error('Scheduled backup error:', error);
    }
  }, checkIntervalMinutes * 60 * 1000);

  return () => clearInterval(interval);
}

/**
 * Get storage usage
 */
export async function getBackupStorageUsage(): Promise<{
  totalBackups: number;
  totalSize: number;
  oldestBackup?: Date;
  newestBackup?: Date;
}> {
  const result = await query(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(size), 0) as total_size,
      MIN(started_at) as oldest,
      MAX(started_at) as newest
    FROM backups
    WHERE status = 'completed'
  `);

  return {
    totalBackups: parseInt(result.rows[0].count),
    totalSize: parseInt(result.rows[0].total_size),
    oldestBackup: result.rows[0].oldest,
    newestBackup: result.rows[0].newest
  };
}

/**
 * Export database schema only
 */
export async function exportSchema(
  outputPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');

    const cmd = `pg_dump --schema-only "${dbUrl}" > "${outputPath}"`;
    await execAsync(cmd);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * List database tables
 */
export async function listTables(): Promise<string[]> {
  const result = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  return result.rows.map((r: any) => r.table_name);
}

/**
 * Get disaster recovery status
 */
export async function getDisasterRecoveryStatus(): Promise<{
  lastBackup?: Date;
  lastBackupSize?: number;
  backupsLast7Days: number;
  backupsLast30Days: number;
  storageUsed: number;
  healthy: boolean;
}> {
  const [backups7d, backups30d, storage, lastBackup] = await Promise.all([
    query(`SELECT COUNT(*) FROM backups WHERE started_at >= NOW() - INTERVAL '7 days' AND status = 'completed'`),
    query(`SELECT COUNT(*) FROM backups WHERE started_at >= NOW() - INTERVAL '30 days' AND status = 'completed'`),
    getBackupStorageUsage(),
    query(`SELECT * FROM backups WHERE status = 'completed' ORDER BY started_at DESC LIMIT 1`)
  ]);

  const healthy = parseInt(backups7d.rows[0].count) > 0;

  return {
    lastBackup: lastBackup.rows[0]?.started_at,
    lastBackupSize: lastBackup.rows[0]?.size,
    backupsLast7Days: parseInt(backups7d.rows[0].count),
    backupsLast30Days: parseInt(backups30d.rows[0].count),
    storageUsed: storage.totalSize,
    healthy
  };
}
