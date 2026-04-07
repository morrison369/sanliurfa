/**
 * Uygulama başlangıcında migrasyonları otomatik olarak çalıştır
 * Bu dosya middleware.ts veya astro.config.mjs'den import edilmeli
 */

import { runMigrations } from './migrations';
import { logger } from './logging';
import { migration_001_initial_schema } from '../migrations/001_initial_schema';
import { migration_002_audit_logging } from '../migrations/002_audit_logging';
import { migration_003_fulltext_search } from '../migrations/003_fulltext_search';
import { migration_004_webhooks } from '../migrations/004_webhooks';
import { migration_005_analytics } from '../migrations/005_analytics';
import { migration_006_roles_permissions } from '../migrations/006_roles_permissions';
import { migration_007_api_keys } from '../migrations/007_api_keys';
import { migration_008_push_subscriptions } from '../migrations/008_push_subscriptions';
import { migration_009_notifications } from '../migrations/009_notifications';
import { migration_010_saved_searches } from '../migrations/010_saved_searches';
import { migration_011_vendor_and_community } from '../migrations/011_vendor_and_community';
import { migration_012_premium_and_content } from '../migrations/012_premium_and_content';
import { migration_013_email_preferences } from '../migrations/013_email_preferences';
import { migration_014_vendor_onboarding } from '../migrations/014_vendor_onboarding';
import { migration_015_user_onboarding } from '../migrations/015_user_onboarding';
import { migration_016_scheduled_reports } from '../migrations/016_scheduled_reports';
import { migration_017_internationalization } from '../migrations/017_internationalization';
import { migration_018_email_campaigns } from '../migrations/018_email_campaigns';

// Tüm migrasyonlar
const ALL_MIGRATIONS = [
  migration_001_initial_schema,
  migration_002_audit_logging,
  migration_003_fulltext_search,
  migration_004_webhooks,
  migration_005_analytics,
  migration_006_roles_permissions,
  migration_007_api_keys,
  migration_008_push_subscriptions,
  migration_009_notifications,
  migration_010_saved_searches,
  migration_011_vendor_and_community,
  migration_012_premium_and_content,
  migration_013_email_preferences,
  migration_014_vendor_onboarding,
  migration_015_user_onboarding,
  migration_016_scheduled_reports,
  migration_017_internationalization,
  migration_018_email_campaigns
];

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
    await runMigrations(ALL_MIGRATIONS);
    logger.info('Migrasyonlar başarıyla tamamlandı');
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
