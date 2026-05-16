#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const imagesRoot = path.join(root, 'public', 'images');
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'static-image-optimization-report.json');
const outMd = path.join(docsDir, 'static-image-optimization-report.md');

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function bytesToMb(bytes) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

function bytesToKb(bytes) {
  return Number((bytes / 1024).toFixed(0));
}

function listFiles(dir, bucket = []) {
  if (!fs.existsSync(dir)) return bucket;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(absolute, bucket);
      continue;
    }
    if (entry.isFile()) bucket.push(absolute);
  }
  return bucket;
}

function toRelative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

async function renderBuffer(filePath, settings, variant) {
  const extension = path.extname(filePath).toLowerCase();
  const input = fs.readFileSync(filePath);
  const maxEdge = variant?.maxEdge ?? null;
  const width = maxEdge ?? settings.maxWidth;
  const height = maxEdge ?? settings.maxHeight;
  const pipeline = sharp(input, { failOn: 'none' }).rotate().resize(width, height, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (extension === '.webp') {
    return pipeline.webp({ quality: variant?.quality ?? settings.webpQuality, effort: 5 }).toBuffer();
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return pipeline.jpeg({
      quality: variant?.quality ?? settings.jpegQuality,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: '4:2:0',
    }).toBuffer();
  }

  return null;
}

async function optimizeBuffer(filePath, settings) {
  const baseline = await renderBuffer(filePath, settings);
  if (!settings.enforceBudget || !baseline || baseline.length <= settings.targetBytes) {
    return baseline;
  }

  const extension = path.extname(filePath).toLowerCase();
  const qualities = extension === '.webp' ? [settings.webpQuality, 78, 76, 74] : [settings.jpegQuality, 78, 76, 74];
  const maxEdges = [settings.maxWidth, 1920, 1800, 1600, 1400, 1280, 1200];

  for (const maxEdge of maxEdges) {
    for (const quality of qualities) {
      const candidate = await renderBuffer(filePath, settings, { maxEdge, quality });
      if (candidate && candidate.length <= settings.targetBytes) return candidate;
    }
  }

  return baseline;
}

async function inspectCandidate(filePath, settings) {
  const stat = fs.statSync(filePath);
  const beforeMetadata = await sharp(filePath, { failOn: 'none' }).metadata();
  const buffer = await optimizeBuffer(filePath, settings);
  if (!buffer) return null;
  const afterMetadata = await sharp(buffer).metadata();
  const savedBytes = stat.size - buffer.length;

  return {
    filePath,
    relativePath: toRelative(filePath),
    beforeBytes: stat.size,
    afterBytes: buffer.length,
    savedBytes,
    beforeKb: bytesToKb(stat.size),
    afterKb: bytesToKb(buffer.length),
    savedKb: bytesToKb(savedBytes),
    beforeWidth: beforeMetadata.width ?? 0,
    beforeHeight: beforeMetadata.height ?? 0,
    afterWidth: afterMetadata.width ?? 0,
    afterHeight: afterMetadata.height ?? 0,
    buffer,
    changed: savedBytes > settings.minSavedBytes,
  };
}

function writeReport(report) {
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# Static Image Optimization Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Mode: ${report.mode}`,
    `- Threshold: ${report.settings.thresholdKb} KB`,
    `- Target budget: ${report.settings.enforceBudget ? `${report.settings.targetKb} KB` : 'not enforced'}`,
    `- Max dimensions: ${report.settings.maxWidth}x${report.settings.maxHeight}`,
    `- Optimized files: ${report.summary.optimizedCount}`,
    `- Skipped locked files: ${report.summary.skippedLockedFileCount}`,
    `- Total saved: ${report.summary.totalSavedMb} MB`,
    '',
    '## Optimized Files',
    '',
    '| Path | Before (KB) | After (KB) | Saved (KB) | Dimensions |',
    '|---|---:|---:|---:|---|',
    ...report.results.map((item) =>
      `| \`${item.path}\` | ${item.beforeKb} | ${item.afterKb} | ${item.savedKb} | ${item.beforeWidth}x${item.beforeHeight} -> ${item.afterWidth}x${item.afterHeight} |`,
    ),
    '',
  ];

  fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
}

const apply = hasArg('apply');
const settings = {
  thresholdKb: Number.parseInt(String(readArg('threshold-kb', '300')), 10),
  targetKb: Number.parseInt(String(readArg('target-kb', readArg('threshold-kb', '300'))), 10),
  enforceBudget: hasArg('enforce-budget'),
  maxWidth: Number.parseInt(String(readArg('max-width', '2400')), 10),
  maxHeight: Number.parseInt(String(readArg('max-height', '2400')), 10),
  jpegQuality: Number.parseInt(String(readArg('jpeg-quality', '82')), 10),
  webpQuality: Number.parseInt(String(readArg('webp-quality', '82')), 10),
  minSavedBytes: Number.parseInt(String(readArg('min-saved-bytes', '2048')), 10),
};
settings.targetBytes = settings.targetKb * 1024;
const thresholdBytes = settings.thresholdKb * 1024;

const candidates = listFiles(imagesRoot)
  .filter((filePath) => /\.(jpe?g|webp)$/i.test(filePath))
  .map((filePath) => ({ filePath, stat: fs.statSync(filePath) }))
  .filter(({ stat }) => stat.size >= thresholdBytes);

const results = [];
const skippedLockedFiles = [];
for (const { filePath } of candidates) {
  const item = await inspectCandidate(filePath, settings);
  if (!item?.changed) continue;

  if (apply) {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, item.buffer);
    try {
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      if (error?.code !== 'EPERM' && error?.code !== 'EACCES') throw error;
      try {
        fs.copyFileSync(tempPath, filePath);
        fs.unlinkSync(tempPath);
      } catch {
        fs.rmSync(tempPath, { force: true });
        skippedLockedFiles.push({
          path: item.relativePath,
          reason: 'locked by filesystem during overwrite',
        });
        continue;
      }
    }
  }

  results.push({
    path: item.relativePath,
    beforeBytes: item.beforeBytes,
    afterBytes: item.afterBytes,
    savedBytes: item.savedBytes,
    beforeKb: item.beforeKb,
    afterKb: item.afterKb,
    savedKb: item.savedKb,
    beforeWidth: item.beforeWidth,
    beforeHeight: item.beforeHeight,
    afterWidth: item.afterWidth,
    afterHeight: item.afterHeight,
  });
}

results.sort((a, b) => b.savedBytes - a.savedBytes);

const totalBeforeBytes = results.reduce((sum, item) => sum + item.beforeBytes, 0);
const totalAfterBytes = results.reduce((sum, item) => sum + item.afterBytes, 0);
const totalSavedBytes = results.reduce((sum, item) => sum + item.savedBytes, 0);
const report = {
  generatedAt: new Date().toISOString(),
  mode: apply ? 'apply' : 'dry-run',
  settings,
  summary: {
    candidateCount: candidates.length,
    optimizedCount: results.length,
    totalBeforeMb: bytesToMb(totalBeforeBytes),
    totalAfterMb: bytesToMb(totalAfterBytes),
    totalSavedMb: bytesToMb(totalSavedBytes),
    skippedLockedFileCount: skippedLockedFiles.length,
  },
  skippedLockedFiles,
  results: results.slice(0, 25),
};

writeReport(report);

console.log(
  `static-image-optimization: ${report.mode.toUpperCase()} (${report.summary.optimizedCount}/${report.summary.candidateCount} optimized, ${report.summary.totalSavedMb} MB saved)`,
);
