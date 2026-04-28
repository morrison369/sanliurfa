import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getPool, query } from '../../src/lib/postgres';

type ManifestRecord = {
  slug: string;
  bucket: string;
  provider: string;
  id: string;
  query: string;
  author: string;
  authorUrl?: string;
  sourceUrl: string;
  thumbUrl?: string;
  localPath: string;
  thumbnailPath: string;
  license: string;
  attributionText: string;
  downloadedAt: string;
};

type CliOptions = {
  dryRun: boolean;
  bucket?: string;
  keyPrefix: string;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    dryRun: argv.includes('--dry-run'),
    keyPrefix: process.env.SITE_MEDIA_KEY_PREFIX || 'content',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--bucket' && argv[i + 1]) {
      opts.bucket = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--prefix' && argv[i + 1]) {
      opts.keyPrefix = argv[i + 1];
      i += 1;
    }
  }

  return opts;
}

function readManifest(manifestPath: string): ManifestRecord[] {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest bulunamadı: ${manifestPath}`);
  }

  const raw = readFileSync(manifestPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Manifest formatı geçersiz. Dizi bekleniyor.');
  }
  return parsed as ManifestRecord[];
}

function toAssetKey(record: ManifestRecord, prefix: string): string {
  return `${prefix}.${record.bucket}.${record.slug}`;
}

function toAltText(record: ManifestRecord): string {
  const normalized = record.slug.replace(/-/g, ' ').trim();
  return `${normalized} - Sanliurfa`;
}

async function upsertRecord(
  assetKey: string,
  record: ManifestRecord,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;

  await query(
    `
    INSERT INTO site_media_assets (
      asset_key,
      url,
      alt,
      mime_type,
      metadata,
      updated_at
    )
    VALUES ($1, $2, $3, 'image/jpeg', $4::jsonb, NOW())
    ON CONFLICT (asset_key)
    DO UPDATE SET
      url = EXCLUDED.url,
      alt = EXCLUDED.alt,
      mime_type = EXCLUDED.mime_type,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    `,
    [
      assetKey,
      record.localPath,
      toAltText(record),
      JSON.stringify({
        bucket: record.bucket,
        slug: record.slug,
        provider: record.provider,
        providerId: record.id,
        providerQuery: record.query,
        author: record.author,
        authorUrl: record.authorUrl || '',
        sourceUrl: record.sourceUrl,
        thumbUrl: record.thumbUrl || '',
        thumbnailPath: record.thumbnailPath,
        license: record.license,
        attributionText: record.attributionText,
        downloadedAt: record.downloadedAt,
      }),
    ],
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = join(process.cwd(), 'public', 'images', 'image-manifest.json');
  const manifest = readManifest(manifestPath);

  const filtered = options.bucket
    ? manifest.filter((item) => item.bucket === options.bucket)
    : manifest;

  if (filtered.length === 0) {
    console.log('Aktarılacak kayıt bulunamadı.');
    return;
  }

  console.log(`Manifest kayıt sayısı: ${manifest.length}`);
  if (options.bucket) {
    console.log(`Bucket filtresi: ${options.bucket}`);
  }
  console.log(`İşlenecek kayıt: ${filtered.length}`);
  console.log(`Anahtar prefix: ${options.keyPrefix}`);
  if (options.dryRun) {
    console.log('Dry-run modunda çalışıyor (DB yazımı yapılmayacak).');
  }

  let processed = 0;
  for (const record of filtered) {
    if (!String(record.license || '').trim()) {
      throw new Error(`Lisans eksik: ${record.slug} (${record.localPath})`);
    }
    if (!String(record.sourceUrl || '').trim()) {
      throw new Error(`Kaynak URL eksik: ${record.slug} (${record.localPath})`);
    }
    if (!String(record.attributionText || '').trim()) {
      throw new Error(`Atıf metni eksik: ${record.slug} (${record.localPath})`);
    }
    const assetKey = toAssetKey(record, options.keyPrefix);
    await upsertRecord(assetKey, record, options.dryRun);
    processed += 1;
    console.log(`[${processed}/${filtered.length}] ${assetKey} -> ${record.localPath}`);
  }

  console.log(`Tamamlandı. Toplam işlenen: ${processed}`);
}

main()
  .catch((error) => {
    console.error(`Import başarısız: ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end();
  });
