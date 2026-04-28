import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

type Issue = {
  severity: 'error' | 'warning';
  code: string;
  file: string;
  message: string;
};

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'public', 'images', 'image-manifest.json');
const FORBIDDEN_NAME_PARTS = ['nude', 'nsfw', 'explicit', 'xxx', 'adult'];

function readManifest(): Array<{
  localPath: string;
  slug: string;
  bucket: string;
  alt?: string;
  license?: string;
  sourceUrl?: string;
  attributionText?: string;
}> {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function main() {
  const records = readManifest();
  const issues: Issue[] = [];
  const hashToFiles = new Map<string, string[]>();
  for (const record of records) {
    const filePath = path.join(ROOT, 'public', record.localPath.replace(/^\/+/, ''));
    const fileName = path.basename(filePath).toLocaleLowerCase('tr-TR');
    if (!String(record.license || '').trim()) {
      issues.push({
        severity: 'error',
        code: 'missing_license',
        file: record.localPath,
        message: 'Lisans bilgisi zorunlu',
      });
    }
    if (!String(record.sourceUrl || '').trim()) {
      issues.push({
        severity: 'error',
        code: 'missing_source_url',
        file: record.localPath,
        message: 'Kaynak URL zorunlu',
      });
    }
    if (!String(record.attributionText || '').trim()) {
      issues.push({
        severity: 'error',
        code: 'missing_attribution',
        file: record.localPath,
        message: 'Atıf metni zorunlu',
      });
    }

    if (!fs.existsSync(filePath)) {
      issues.push({
        severity: 'error',
        code: 'missing_image_file',
        file: record.localPath,
        message: 'Manifest kaydı var ama dosya bulunamadı',
      });
      continue;
    }

    const stat = fs.statSync(filePath);
    if (stat.size > 1_500_000) {
      issues.push({
        severity: 'warning',
        code: 'image_file_large',
        file: record.localPath,
        message: `Dosya boyutu yüksek (${Math.round(stat.size / 1024)} KB)`,
      });
    }

    if (FORBIDDEN_NAME_PARTS.some((part) => fileName.includes(part))) {
      issues.push({
        severity: 'error',
        code: 'forbidden_filename_signal',
        file: record.localPath,
        message: 'Dosya adında moderasyon blacklist sinyali bulundu',
      });
    }

    // pHash-like average hash for duplicate detection
    // 8x8 grayscale average hash
    // This is a lightweight perceptual duplicate signal.
    try {
      const { data } = await sharp(filePath).resize(8, 8).grayscale().raw().toBuffer({ resolveWithObject: true });
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      const bits = Array.from(data, (v) => (v >= avg ? '1' : '0')).join('');
      const arr = hashToFiles.get(bits) || [];
      arr.push(record.localPath);
      hashToFiles.set(bits, arr);
    } catch {
      issues.push({
        severity: 'warning',
        code: 'phash_compute_failed',
        file: record.localPath,
        message: 'pHash hesaplanamadı',
      });
    }
  }

  for (const [hash, files] of hashToFiles.entries()) {
    if (files.length > 1) {
      issues.push({
        severity: 'warning',
        code: 'potential_duplicate_image',
        file: files.join(', '),
        message: `Aynı pHash bulundu (${hash.slice(0, 16)}...), duplicate adayları`,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scanned: records.length,
    issueCount: issues.length,
    issues,
  };

  const docsDir = path.join(ROOT, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const outJson = path.join(docsDir, 'image-moderation-report.json');
  const outMd = path.join(docsDir, 'image-moderation-report.md');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');
  const mdLines = [
    '# Image Moderation Report',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Scanned: ${report.scanned}`,
    `- Issue Count: ${report.issueCount}`,
    '',
    ...(issues.length
      ? ['## Issues', '', ...issues.map((x) => `- [${x.severity}][${x.code}] ${x.file}: ${x.message}`)]
      : ['## Status', '', '- OK: Moderation gate geçti.']),
    '',
  ];
  fs.writeFileSync(outMd, mdLines.join('\n'), 'utf8');

  console.log(`image moderation report: ${outJson}`);
  if (issues.some((x) => x.severity === 'error')) process.exit(1);
}

main().catch((error) => {
  console.error(`image moderation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
