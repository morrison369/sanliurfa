#!/usr/bin/env tsx

/**
 * Migrasyon CLI aracı
 *
 * Kullanım:
 *   npm run migrate          - Tüm migrasyonları çalıştır
 *   npm run migrate status   - Migrasyon durumunu göster
 *   npm run migrate rollback - Son migrasyonu geri al
 */

import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type MigrationRecord = {
  version: string;
  description: string;
  up: (client: any) => Promise<void>;
  down: (client: any) => Promise<void>;
};

function isCandidateMigration(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.up === 'function' && typeof candidate.down === 'function';
}

function normalizeMigration(candidate: Record<string, unknown>, file: string): MigrationRecord {
  const version =
    typeof candidate.version === 'string'
      ? candidate.version
      : typeof candidate.name === 'string'
        ? candidate.name
        : file.replace(/\.ts$/, '');
  const description =
    typeof candidate.description === 'string'
      ? candidate.description
      : `Migration ${version}`;
  return {
    version,
    description,
    up: candidate.up as (client: any) => Promise<void>,
    down: candidate.down as (client: any) => Promise<void>
  };
}

function normalizeFunctionStyleMigration(mod: Record<string, unknown>, file: string): MigrationRecord | null {
  const migrationEntry = Object.entries(mod).find(
    ([key, value]) => key.startsWith('migration_') && typeof value === 'function'
  );
  if (!migrationEntry) {
    return null;
  }

  const [migrationKey, migrationFn] = migrationEntry;
  const suffix = migrationKey.replace(/^migration_/, '');
  const rollbackBySuffix = `rollback_${suffix}`;
  const rollbackByNumeric = `rollback_${suffix.split('_')[0]}`;
  const rollbackFn =
    (typeof mod[rollbackBySuffix] === 'function' ? mod[rollbackBySuffix] : undefined) ??
    (typeof mod[rollbackByNumeric] === 'function' ? mod[rollbackByNumeric] : undefined);

  if (typeof rollbackFn !== 'function') {
    return null;
  }

  return {
    version: suffix || file.replace(/\.ts$/, ''),
    description: `Migration ${suffix || file}`,
    up: migrationFn as (client: any) => Promise<void>,
    down: rollbackFn as (client: any) => Promise<void>
  };
}

async function loadMigrations(): Promise<MigrationRecord[]> {
  const migrationsDir = resolve('src/migrations');
  const files = readdirSync(migrationsDir)
    .filter((name) => /^\d{3}_.+\.ts$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  const all: MigrationRecord[] = [];
  for (const file of files) {
    const moduleUrl = pathToFileURL(join(migrationsDir, file)).href;
    const mod = await import(moduleUrl);
    const exported = Object.values(mod).find(isCandidateMigration);
    if (exported) {
      all.push(normalizeMigration(exported, file));
      continue;
    }

    const fnStyle = normalizeFunctionStyleMigration(mod as Record<string, unknown>, file);
    if (fnStyle) {
      all.push(fnStyle);
      continue;
    }

    if (!exported) {
      throw new Error(`Geçerli migrasyon export'u bulunamadı: ${file}`);
    }
  }

  if (all.length === 0) {
    throw new Error('Hiç migrasyon dosyası bulunamadı');
  }

  return all;
}

function listMigrationManifest(): Array<{ version: string; description: string }> {
  const migrationsDir = resolve('src/migrations');
  const files = readdirSync(migrationsDir)
    .filter((name) => /^\d{3}_.+\.ts$/.test(name))
    .sort((a, b) => a.localeCompare(b));
  return files.map((file) => {
    const version = file.replace(/\.ts$/, '');
    return {
      version,
      description: `Migration ${version}`
    };
  });
}

async function main() {
  const command = process.argv[2] || 'run';

  try {
    switch (command) {
      case 'run':
        {
        const { runMigrations } = await import('../src/lib/migrations');
        const ALL_MIGRATIONS = await loadMigrations();
        console.log(`📦 Migrasyonlar çalıştırılıyor... (${ALL_MIGRATIONS.length} dosya)`);
        await runMigrations(ALL_MIGRATIONS);
        console.log('✅ Migrasyonlar tamamlandı!');
        break;
        }

      case 'status':
        {
        const manifest = listMigrationManifest();
        console.log('📋 Migrasyon Durumu\n');
        console.log('Manifest modu: bu komut sadece sürüm dosyalarını raporlar.');
        manifest.forEach((m) => {
          console.log(`  - ${m.version}`);
        });
        console.log(`\nToplam migrasyon dosyası: ${manifest.length}`);
        break;
        }

      case 'rollback':
        {
        const { rollbackMigration, getMigrationHistory } = await import('../src/lib/migrations');
        const ALL_MIGRATIONS = await loadMigrations();
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
        }

      case 'rollback-all':
        {
        const { rollbackAll } = await import('../src/lib/migrations');
        const ALL_MIGRATIONS = await loadMigrations();
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
        }

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
