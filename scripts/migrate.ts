#!/usr/bin/env tsx

/**
 * Migrasyon CLI aracı
 *
 * Kullanım:
 *   npm run migrate          - Tüm migrasyonları çalıştır
 *   npm run migrate status   - Migrasyon durumunu göster
 *   npm run migrate rollback - Son migrasyonu geri al
 */

import { runMigrations, rollbackMigration, getMigrationHistory, validateMigrations, rollbackAll } from '../src/lib/migrations';
import { migration_001_initial_schema } from '../src/migrations/001_initial_schema';
import { logger } from '../src/lib/logging';

// Tüm migrasyonlar buraya eklenmeli
const ALL_MIGRATIONS = [
  migration_001_initial_schema
];

async function main() {
  const command = process.argv[2] || 'run';

  try {
    switch (command) {
      case 'run':
        console.log('📦 Migrasyonlar çalıştırılıyor...');
        await runMigrations(ALL_MIGRATIONS);
        console.log('✅ Migrasyonlar tamamlandı!');
        break;

      case 'status':
        console.log('📋 Migrasyon Durumu\n');
        const history = await getMigrationHistory();
        if (history.length === 0) {
          console.log('Hiç migrasyon çalıştırılmadı');
        } else {
          console.log('Çalıştırılan migrasyonlar:');
          history.forEach(m => {
            const date = new Date(m.executedAt).toLocaleString('tr-TR');
            console.log(`  ✓ ${m.version}`);
            console.log(`    ${m.description}`);
            console.log(`    ${date}\n`);
          });
        }

        console.log('\nBeklenen migrasyonlar:');
        ALL_MIGRATIONS.forEach(m => {
          const isExecuted = history.some(h => h.version === m.version);
          const status = isExecuted ? '✓' : '⏳';
          console.log(`  ${status} ${m.version}`);
          console.log(`    ${m.description}\n`);
        });

        const validation = await validateMigrations(ALL_MIGRATIONS);
        if (!validation.valid) {
          console.log('⚠️  Uyarılar:');
          if (validation.missing.length > 0) {
            console.log(`  Eksik migrasyonlar: ${validation.missing.join(', ')}`);
          }
          if (validation.extra.length > 0) {
            console.log(`  Tanımlanmamış migrasyonlar: ${validation.extra.join(', ')}`);
          }
        } else {
          console.log('✅ Tüm migrasyonlar senkronize');
        }
        break;

      case 'rollback':
        console.log('⏮️  Son migrasyon geri alınıyor...');
        const history2 = await getMigrationHistory();
        if (history2.length === 0) {
          console.log('Geri alınacak migrasyon yok');
          break;
        }

        const lastVersion = history2[history2.length - 1].version;
        const lastMigration = ALL_MIGRATIONS.find(m => m.version === lastVersion);

        if (!lastMigration) {
          console.log(`Migrasyon tanımı bulunamadı: ${lastVersion}`);
          break;
        }

        await rollbackMigration(lastMigration);
        console.log(`✅ Migrasyon geri alındı: ${lastVersion}`);
        break;

      case 'rollback-all':
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Rollback All sadece geliştirme ortamında yapılabilir!');
          process.exit(1);
        }
        console.log('🗑️  TÜM MİGRASYONLAR GERİ ALINACAK!');
        console.log('Devam etmek için Ctrl+C tuşlaması yapmalı veya 5 saniye bekleyiniz...\n');

        await new Promise(resolve => setTimeout(resolve, 5000));
        await rollbackAll(ALL_MIGRATIONS);
        console.log('✅ Tüm migrasyonlar geri alındı');
        break;

      default:
        console.log(`Bilinmeyen komut: ${command}`);
        console.log('\nKullanılabilir komutlar:');
        console.log('  run        - Tüm migrasyonları çalıştır');
        console.log('  status     - Migrasyon durumunu göster');
        console.log('  rollback   - Son migrasyonu geri al');
        console.log('  rollback-all - Tüm migrasyonları geri al (sadece dev)');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Hata:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
