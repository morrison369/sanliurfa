/**
 * Veritabanı migrasyon sistemi
 * Tüm şema değişiklikleri burada tanımlanır
 */

import { pool } from './postgres';
import { logger } from './logging';

/**
 * Migrasyon tanımı
 */
export interface Migration {
  version: string;
  description: string;
  up: (client: any) => Promise<void>;
  down: (client: any) => Promise<void>;
}

/**
 * Migrasyon geçmişi
 */
interface MigrationHistory {
  version: string;
  description: string;
  executedAt: Date;
}

/**
 * Migrasyonlar tablosunu oluştur
 */
async function createMigrationsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(100) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    logger.error('Migrasyonlar tablosu oluşturulurken hata', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Çalıştırılmış migrasyonları al
 */
async function getExecutedMigrations(): Promise<MigrationHistory[]> {
  try {
    const result = await pool.query(`
      SELECT version, description, executed_at as "executedAt"
      FROM migrations
      ORDER BY executed_at ASC
    `);
    return result.rows;
  } catch (error) {
    logger.error('Migrasyon geçmişi okunurken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Migrasyonu kaydedildi olarak işaretle
 */
async function recordMigration(version: string, description: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO migrations (version, description) VALUES ($1, $2)`,
      [version, description]
    );
  } catch (error) {
    logger.error('Migrasyon kaydedilirken hata', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Migrasyon kaydını sil
 */
async function removeMigrationRecord(version: string): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM migrations WHERE version = $1`,
      [version]
    );
  } catch (error) {
    logger.error('Migrasyon kaydı silinirken hata', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Tüm migrasyonları çalıştır
 */
export async function runMigrations(migrations: Migration[]): Promise<void> {
  await createMigrationsTable();

  const executed = await getExecutedMigrations();
  const executedVersions = new Set(executed.map(m => m.version));

  logger.info('Migrasyonlar başlıyor', {
    toplam: migrations.length,
    çalıştırılmış: executedVersions.size
  });

  for (const migration of migrations) {
    if (executedVersions.has(migration.version)) {
      logger.debug(`Migrasyon atlanıyor: ${migration.version} (zaten çalıştırıldı)`);
      continue;
    }

    try {
      logger.info(`Migrasyon çalıştırılıyor: ${migration.version} - ${migration.description}`);
      await migration.up(pool);
      await recordMigration(migration.version, migration.description);
      logger.info(`Migrasyon başarılı: ${migration.version}`);
    } catch (error) {
      logger.error(
        `Migrasyon başarısız: ${migration.version}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  logger.info('Tüm migrasyonlar tamamlandı');
}

/**
 * Migrasyonu geri al
 */
export async function rollbackMigration(migration: Migration): Promise<void> {
  try {
    logger.info(`Migrasyon geri alınıyor: ${migration.version}`);
    await migration.down(pool);
    await removeMigrationRecord(migration.version);
    logger.info(`Migrasyon geri alındı: ${migration.version}`);
  } catch (error) {
    logger.error(
      `Migrasyon geri alma başarısız: ${migration.version}`,
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Migrasyon geçmişini görüntüle
 */
export async function getMigrationHistory(): Promise<MigrationHistory[]> {
  await createMigrationsTable();
  return getExecutedMigrations();
}

/**
 * Tüm migrasyonları geri al (sadece geliştirme ortamında kullanılmalı!)
 */
export async function rollbackAll(migrations: Migration[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Rollback All sadece geliştirme ortamında yapılabilir!');
  }

  const executed = await getExecutedMigrations();
  const reversedMigrations = migrations.reverse();

  for (const migration of reversedMigrations) {
    if (executed.some(m => m.version === migration.version)) {
      try {
        await migration.down(pool);
        await removeMigrationRecord(migration.version);
        logger.info(`Migrasyon geri alındı: ${migration.version}`);
      } catch (error) {
        logger.error(
          `Migrasyon geri alma başarısız: ${migration.version}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  logger.info('Tüm migrasyonlar geri alındı');
}

/**
 * Migrasyonları kontrol et (başarısız migrasyonları tespit et)
 */
export async function validateMigrations(migrations: Migration[]): Promise<{
  valid: boolean;
  missing: string[];
  extra: string[];
}> {
  const executed = await getExecutedMigrations();
  const executedVersions = new Set(executed.map(m => m.version));
  const definedVersions = new Set(migrations.map(m => m.version));

  const missing = migrations
    .filter(m => !executedVersions.has(m.version))
    .map(m => m.version);

  const extra = executed
    .filter(m => !definedVersions.has(m.version))
    .map(m => m.version);

  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra
  };
}
