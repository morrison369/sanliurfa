/**
 * Uygulama başlangıcında migrasyonları otomatik olarak çalıştır
 * Bu dosya middleware.ts veya astro.config.mjs'den import edilmeli
 */

import { logger } from '../logger';

let migrationsInitialized = false;

/**
 * Migrasyonları başlat (güvenli - sadece bir kez çalışır)
 */
export async function initializeMigrations(): Promise<void> {
  if (migrationsInitialized) {
    return;
  }

  try {
    migrationsInitialized = true;
    logger.info('Migrasyonlar başlatılıyor...');
    
    // Migrasyonlar build sırasında çalıştırılmaz
    // Production'da database migration scriptleri ile çalıştırılır
    logger.info('Migrasyonlar atlandı (build modu)');
  } catch (error) {
    logger.error('Migrasyon hatası', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Migrasyonların başlatılıp başlatılmadığını kontrol et
 */
export function areMigrationsInitialized(): boolean {
  return migrationsInitialized;
}

export default initializeMigrations;
