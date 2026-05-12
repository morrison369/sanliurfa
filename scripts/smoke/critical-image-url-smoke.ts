import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type ManifestRecord = {
  slug: string;
  bucket: string;
  localPath: string;
  thumbnailPath: string;
};

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'public', 'images', 'image-manifest.json');
const PRIORITY_SLUGS = ['balikligol', 'gobeklitepe', 'halfeti', 'harran'];
const HERO_FALLBACK = '/images/hero/hero-home.webp';

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadRuntimeEnv() {
  const candidates = [
    join(ROOT, '.env.production'),
    join(ROOT, '.env.local'),
    join(ROOT, '.env'),
  ];
  for (const candidate of candidates) loadEnvFile(candidate);
}

function readManifest(): ManifestRecord[] {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest bulunamadı: ${MANIFEST_PATH}`);
  }
  const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  if (!Array.isArray(parsed)) {
    throw new Error('Manifest formatı geçersiz');
  }
  return parsed as ManifestRecord[];
}

function toFs(publicPath: string): string {
  return join(ROOT, 'public', publicPath.replace(/^\//, ''));
}

async function loadHeroBackground(): Promise<string | null> {
  const { queryOne, pool } = await import('../../src/lib/postgres');
  try {
    const reg = await queryOne<{ reg: string | null }>(
      `SELECT to_regclass('public.site_settings') AS reg`,
      [],
    );
    if (!reg?.reg) return null;

    const row = await queryOne<{ setting_value: Record<string, any> }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'homepage.hero'`,
      [],
    );
    const value = row?.setting_value;
    if (!value || typeof value !== 'object') return null;
    const bg = String(value.backgroundImage || '').trim();
    return bg || null;
  } catch {
    return null;
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  loadRuntimeEnv();
  const manifest = readManifest();
  const errors: string[] = [];

  const priorityRecords = manifest.filter((m) => PRIORITY_SLUGS.includes(m.slug)).slice(0, 8);
  if (priorityRecords.length === 0) {
    errors.push('Öncelikli slug kayıtları manifestte bulunamadı');
  }

  for (const record of priorityRecords) {
    const mainFs = toFs(record.localPath);
    const thumbFs = toFs(record.thumbnailPath);
    if (!existsSync(mainFs)) {
      errors.push(`${record.slug}: ana görsel eksik (${record.localPath})`);
    }
    if (!existsSync(thumbFs)) {
      errors.push(`${record.slug}: thumb görsel eksik (${record.thumbnailPath})`);
    }
  }

  const heroBackground = await loadHeroBackground();
  const effectiveHero = heroBackground || HERO_FALLBACK;
  if (effectiveHero.startsWith('/')) {
    if (!existsSync(toFs(effectiveHero))) {
      errors.push(`Hero background dosyası yok: ${effectiveHero}`);
    }
  }

  if (errors.length > 0) {
    console.error('Critical image URL smoke failed:');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  console.log('Critical image URL smoke passed');
}

main().catch((error) => {
  console.error(`Critical image URL smoke error: ${error instanceof Error ? error.message : 'unknown'}`);
  process.exit(1);
});
