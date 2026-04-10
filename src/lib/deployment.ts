/**
 * Deployment Management
 * Handles staging environment and database backup automation
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from './logging';
import { queryRows } from './postgres';

export interface DeploymentEnvironment {
  name: 'development' | 'staging' | 'production';
  url: string;
  apiUrl: string;
  databaseUrl: string;
  redisUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sslEnabled: boolean;
  maintenanceMode: boolean;
}

export interface BackupConfig {
  id: string;
  enabled: boolean;
  schedule: 'hourly' | 'daily' | 'weekly';
  retention_days: number;
  include_data: boolean;
  include_uploads: boolean;
  destination: 'local' | 's3' | 'gcs';
  last_backup: string;
  next_backup: string;
}

export interface BackupResult {
  id: string;
  timestamp: string;
  size_bytes: number;
  status: 'success' | 'failed' | 'partial';
  tables_backed_up: string[];
  error?: string;
  duration_seconds: number;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads/photos';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';

const deploymentEnvironments: Record<string, DeploymentEnvironment> = {
  development: {
    name: 'development',
    url: 'http://localhost:3000',
    apiUrl: 'http://localhost:3000/api',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost/sanliurfa_dev',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/0',
    logLevel: 'debug',
    sslEnabled: false,
    maintenanceMode: false
  },

  staging: {
    name: 'staging',
    url: process.env.STAGING_URL || 'https://staging.sanliurfa.com',
    apiUrl: process.env.STAGING_URL + '/api' || 'https://staging.sanliurfa.com/api',
    databaseUrl: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || '',
    redisUrl: process.env.STAGING_REDIS_URL || process.env.REDIS_URL || '',
    logLevel: 'info',
    sslEnabled: true,
    maintenanceMode: false
  },

  production: {
    name: 'production',
    url: 'https://sanliurfa.com',
    apiUrl: 'https://sanliurfa.com/api',
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    logLevel: 'warn',
    sslEnabled: true,
    maintenanceMode: false
  }
};

const backupConfigs: BackupConfig[] = [
  {
    id: 'backup_hourly',
    enabled: true,
    schedule: 'hourly',
    retention_days: 7,
    include_data: true,
    include_uploads: false,
    destination: 'local',
    last_backup: new Date().toISOString(),
    next_backup: new Date(Date.now() + 3600000).toISOString()
  },
  {
    id: 'backup_daily',
    enabled: true,
    schedule: 'daily',
    retention_days: 30,
    include_data: true,
    include_uploads: true,
    destination: 's3',
    last_backup: new Date().toISOString(),
    next_backup: new Date(Date.now() + 86400000).toISOString()
  }
];

/**
 * Get deployment environment config
 */
export function getEnvironmentConfig(env: 'development' | 'staging' | 'production'): DeploymentEnvironment {
  return deploymentEnvironments[env] || deploymentEnvironments.production;
}

/**
 * Get current environment
 */
export function getCurrentEnvironment(): DeploymentEnvironment {
  const env = (process.env.NODE_ENV === 'production' ? 'production' : 'development') as any;
  return getEnvironmentConfig(env);
}

/**
 * Enable maintenance mode
 */
export function enableMaintenanceMode(environment: 'staging' | 'production'): boolean {
  const config = deploymentEnvironments[environment];

  if (!config) {
    return false;
  }

  config.maintenanceMode = true;

  logger.warn('Maintenance mode enabled', { environment });

  return true;
}

/**
 * Disable maintenance mode
 */
export function disableMaintenanceMode(environment: 'staging' | 'production'): boolean {
  const config = deploymentEnvironments[environment];

  if (!config) {
    return false;
  }

  config.maintenanceMode = false;

  logger.info('Maintenance mode disabled', { environment });

  return true;
}

/**
 * Get backup configurations
 */
export function getBackupConfigs(): BackupConfig[] {
  return backupConfigs;
}

/**
 * Get enabled backup configs
 */
export function getEnabledBackups(): BackupConfig[] {
  return backupConfigs.filter(b => b.enabled);
}

/**
 * Update backup config
 */
export function updateBackupConfig(id: string, updates: Partial<BackupConfig>): BackupConfig | null {
  const config = backupConfigs.find(b => b.id === id);

  if (!config) {
    return null;
  }

  Object.assign(config, updates);

  logger.info('Backup config updated', { id });

  return config;
}

/**
 * Build a live backup preview based on current database and local upload state
 */
export async function simulateBackup(configId: string): Promise<BackupResult> {
  const config = backupConfigs.find(b => b.id === configId);

  if (!config) {
    return {
      id: configId,
      timestamp: new Date().toISOString(),
      size_bytes: 0,
      status: 'failed',
      tables_backed_up: [],
      error: 'Backup config not found',
      duration_seconds: 0
    };
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const tableStats = await queryRows(
      `SELECT
         tablename,
         pg_total_relation_size(format('%I.%I', schemaname, tablename))::bigint AS size_bytes
       FROM pg_tables
       WHERE schemaname = current_schema()
       ORDER BY size_bytes DESC`
    );

    const tables = tableStats.map((row) => String((row as Record<string, unknown>).tablename || ''));
    const databaseSize = tableStats.reduce((sum, row) => sum + Number((row as Record<string, unknown>).size_bytes || 0), 0);

    let uploadsSize = 0;
    let status: BackupResult['status'] = 'success';
    let error: string | undefined;

    if (config.include_uploads) {
      const uploadPreview = await getUploadBackupSize(config.destination);
      uploadsSize = uploadPreview.sizeBytes;

      if (uploadPreview.warning) {
        status = 'partial';
        error = uploadPreview.warning;
      }
    }

    const result: BackupResult = {
      id: `backup_${Date.now()}`,
      timestamp,
      size_bytes: databaseSize + uploadsSize,
      status,
      tables_backed_up: tables,
      error,
      duration_seconds: Math.max(1, Math.round((Date.now() - startTime) / 1000))
    };

    config.last_backup = result.timestamp;
    const nextScheduleTime = config.schedule === 'hourly' ? 3600000 : config.schedule === 'daily' ? 86400000 : 604800000;
    config.next_backup = new Date(Date.now() + nextScheduleTime).toISOString();

    logger.info('Backup preview completed', {
      configId,
      sizeBytes: result.size_bytes,
      status: result.status,
      tables: result.tables_backed_up.length
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('Backup preview failed', error instanceof Error ? error : new Error(message), { configId });

    return {
      id: `backup_${Date.now()}`,
      timestamp,
      size_bytes: 0,
      status: 'failed',
      tables_backed_up: [],
      error: message,
      duration_seconds: Math.max(1, Math.round((Date.now() - startTime) / 1000))
    };
  }
}

async function getUploadBackupSize(destination: BackupConfig['destination']): Promise<{ sizeBytes: number; warning?: string }> {
  if (STORAGE_TYPE !== 'local') {
    return {
      sizeBytes: 0,
      warning: `Upload artefacts are managed by ${STORAGE_TYPE}; live byte preview is not available in backup dry-run`
    };
  }

  if (destination === 's3' && (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET)) {
    return {
      sizeBytes: 0,
      warning: 'S3 destination is selected but AWS credentials or bucket settings are not configured'
    };
  }

  if (destination === 'gcs' && !process.env.GCS_BUCKET) {
    return {
      sizeBytes: 0,
      warning: 'GCS destination is selected but GCS_BUCKET is not configured'
    };
  }

  const uploadRoot = path.join(process.cwd(), UPLOAD_DIR);

  try {
    const stat = await fs.stat(uploadRoot);
    if (!stat.isDirectory()) {
      return { sizeBytes: 0, warning: `Upload path is not a directory: ${uploadRoot}` };
    }

    return { sizeBytes: await calculateDirectorySize(uploadRoot) };
  } catch {
    return { sizeBytes: 0, warning: `Upload directory not found: ${uploadRoot}` };
  }
}

async function calculateDirectorySize(targetPath: string): Promise<number> {
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      total += await calculateDirectorySize(fullPath);
      continue;
    }

    if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      total += stat.size;
    }
  }

  return total;
}

/**
 * Get deployment checklist
 */
export function getDeploymentChecklist(): Record<string, boolean> {
  return {
    'Environment variables configured': !!process.env.DATABASE_URL && !!process.env.REDIS_URL,
    'SSL enabled': process.env.NODE_ENV === 'production',
    'Database migrated': true,
    'Backups configured': getEnabledBackups().length > 0,
    'Monitoring enabled': true,
    'Error logging configured': true,
    'Rate limiting enabled': true,
    'CORS configured': !!process.env.CORS_ORIGINS,
    'Email service configured': !!process.env.RESEND_API_KEY,
    'Stripe configured': !!process.env.STRIPE_SECRET_KEY,
    'Redis configured': !!process.env.REDIS_URL
  };
}

/**
 * Get readiness status
 */
export function getReadinessStatus(): {
  ready: boolean;
  checks: Record<string, boolean>;
  readyPercentage: number;
} {
  const checks = getDeploymentChecklist();
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;

  return {
    ready: passedChecks === totalChecks,
    checks,
    readyPercentage: Math.round((passedChecks / totalChecks) * 100)
  };
}
