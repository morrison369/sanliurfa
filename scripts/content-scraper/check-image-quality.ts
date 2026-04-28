import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

type ManifestRecord = {
  slug: string;
  bucket: string;
  localPath: string;
  thumbnailPath: string;
};

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'public', 'images', 'image-manifest.json');

const MIN_MAIN_WIDTH = Math.max(800, Number(process.env.IMAGE_QUALITY_MIN_MAIN_WIDTH || 1000));
const MIN_MAIN_HEIGHT = Math.max(500, Number(process.env.IMAGE_QUALITY_MIN_MAIN_HEIGHT || 600));
const MIN_THUMB_WIDTH = Math.max(200, Number(process.env.IMAGE_QUALITY_MIN_THUMB_WIDTH || 300));
const MIN_THUMB_HEIGHT = Math.max(120, Number(process.env.IMAGE_QUALITY_MIN_THUMB_HEIGHT || 180));

const MAX_MAIN_SIZE_BYTES = Math.max(
  300_000,
  Number(process.env.IMAGE_QUALITY_MAX_MAIN_BYTES || 2_500_000),
);
const MAX_THUMB_SIZE_BYTES = Math.max(
  80_000,
  Number(process.env.IMAGE_QUALITY_MAX_THUMB_BYTES || 800_000),
);

function toFsPath(publicPath: string): string {
  return join(ROOT, 'public', publicPath.replace(/^\//, ''));
}

function readManifest(): ManifestRecord[] {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest bulunamadı: ${MANIFEST_PATH}`);
  }
  const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  if (!Array.isArray(parsed)) {
    throw new Error('Manifest formatı geçersiz (dizi bekleniyor)');
  }
  return parsed as ManifestRecord[];
}

async function getMeta(path: string): Promise<{ width: number; height: number }> {
  const sharpMod = await import('sharp').catch(() => null);
  if (!sharpMod?.default) {
    throw new Error('sharp modülü bulunamadı');
  }
  const meta = await sharpMod.default(path).metadata();
  return {
    width: Number(meta.width || 0),
    height: Number(meta.height || 0),
  };
}

async function main(): Promise<void> {
  const manifest = readManifest();
  if (manifest.length === 0) {
    console.log('Image quality: manifest boş, kontrol atlandı');
    return;
  }

  const errors: string[] = [];

  for (const item of manifest) {
    const mainPath = toFsPath(item.localPath);
    const thumbPath = toFsPath(item.thumbnailPath);

    if (!existsSync(mainPath)) {
      errors.push(`${item.bucket}/${item.slug}: ana görsel yok (${item.localPath})`);
      continue;
    }
    if (!existsSync(thumbPath)) {
      errors.push(`${item.bucket}/${item.slug}: thumb görsel yok (${item.thumbnailPath})`);
      continue;
    }

    const mainStat = statSync(mainPath);
    const thumbStat = statSync(thumbPath);

    if (mainStat.size > MAX_MAIN_SIZE_BYTES) {
      errors.push(
        `${item.bucket}/${item.slug}: ana görsel fazla büyük (${mainStat.size} bytes > ${MAX_MAIN_SIZE_BYTES})`,
      );
    }
    if (thumbStat.size > MAX_THUMB_SIZE_BYTES) {
      errors.push(
        `${item.bucket}/${item.slug}: thumb fazla büyük (${thumbStat.size} bytes > ${MAX_THUMB_SIZE_BYTES})`,
      );
    }

    try {
      const mainMeta = await getMeta(mainPath);
      const thumbMeta = await getMeta(thumbPath);

      if (mainMeta.width < MIN_MAIN_WIDTH || mainMeta.height < MIN_MAIN_HEIGHT) {
        errors.push(
          `${item.bucket}/${item.slug}: ana görsel çözünürlüğü düşük (${mainMeta.width}x${mainMeta.height})`,
        );
      }
      if (thumbMeta.width < MIN_THUMB_WIDTH || thumbMeta.height < MIN_THUMB_HEIGHT) {
        errors.push(
          `${item.bucket}/${item.slug}: thumb çözünürlüğü düşük (${thumbMeta.width}x${thumbMeta.height})`,
        );
      }
    } catch (error) {
      errors.push(
        `${item.bucket}/${item.slug}: metadata okunamadı (${error instanceof Error ? error.message : 'unknown'})`,
      );
    }
  }

  if (errors.length > 0) {
    console.error('Image quality gate failed:');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  console.log(`Image quality gate passed (${manifest.length} kayıt)`);
}

main().catch((error) => {
  console.error(`Image quality gate error: ${error instanceof Error ? error.message : 'unknown'}`);
  process.exit(1);
});
