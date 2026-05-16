#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const uploadsRoot = path.join(root, 'public', 'uploads');
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'local-upload-optimization-report.json');
const outMd = path.join(docsDir, 'local-upload-optimization-report.md');

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];
  return fallback;
}

function hasArg(name) {
  return process.argv.includes(`--${name}`);
}

function bytesToMb(bytes) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

function listFiles(dir, bucket = []) {
  if (!fs.existsSync(dir)) return bucket;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(absolute, bucket);
      continue;
    }
    if (entry.isFile()) {
      bucket.push(absolute);
    }
  }
  return bucket;
}

function toRelative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

async function inspectCandidate(filePath, settings) {
  const stat = fs.statSync(filePath);
  const original = sharp(filePath, { failOn: 'none' }).rotate();
  const originalMetadata = await original.metadata();
  const optimizedBuffer = await original
    .clone()
    .resize(settings.maxWidth, settings.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: settings.quality,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: '4:2:0',
    })
    .toBuffer();
  const optimizedMetadata = await sharp(optimizedBuffer).metadata();
  const savedBytes = stat.size - optimizedBuffer.length;

  return {
    filePath,
    relativePath: toRelative(filePath),
    beforeBytes: stat.size,
    afterBytes: optimizedBuffer.length,
    savedBytes,
    beforeMb: bytesToMb(stat.size),
    afterMb: bytesToMb(optimizedBuffer.length),
    savedMb: bytesToMb(savedBytes),
    beforeWidth: originalMetadata.width ?? 0,
    beforeHeight: originalMetadata.height ?? 0,
    afterWidth: optimizedMetadata.width ?? 0,
    afterHeight: optimizedMetadata.height ?? 0,
    changed: optimizedBuffer.length < stat.size,
    buffer: optimizedBuffer,
  };
}

function writeOptimizationReport(report) {
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# Local Upload Optimization Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Mode: ${report.mode}`,
    `- Threshold: ${report.settings.thresholdKb} KB`,
    `- Max dimensions: ${report.settings.maxWidth}x${report.settings.maxHeight}`,
    `- JPEG quality: ${report.settings.quality}`,
    `- Candidate files: ${report.summary.candidateCount}`,
    `- Optimized files: ${report.summary.optimizedCount}`,
    `- Total before: ${report.summary.totalBeforeMb} MB`,
    `- Total after: ${report.summary.totalAfterMb} MB`,
    `- Total saved: ${report.summary.totalSavedMb} MB`,
    '',
    '## Largest Savings',
    '',
    '| Path | Before (MB) | After (MB) | Saved (MB) | Dimensions |',
    '|---|---:|---:|---:|---|',
    ...report.results.map((item) =>
      `| \`${item.path}\` | ${item.beforeMb} | ${item.afterMb} | ${item.savedMb} | ${item.beforeWidth}x${item.beforeHeight} -> ${item.afterWidth}x${item.afterHeight} |`,
    ),
    '',
  ];

  fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
}

const apply = hasArg('apply');
const onlyDirs = String(readArg('dir', ''))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const settings = {
  thresholdKb: Number.parseInt(String(readArg('threshold-kb', '1024')), 10),
  maxWidth: Number.parseInt(String(readArg('max-width', '2400')), 10),
  maxHeight: Number.parseInt(String(readArg('max-height', '2400')), 10),
  quality: Number.parseInt(String(readArg('quality', '82')), 10),
};
const thresholdBytes = settings.thresholdKb * 1024;

const files = listFiles(uploadsRoot).filter((filePath) => {
  const relativePath = toRelative(filePath);
  if (!/\.(jpe?g)$/i.test(relativePath)) {
    return false;
  }
  if (onlyDirs.length === 0) {
    return true;
  }
  return onlyDirs.some((dirName) => relativePath.startsWith(`public/uploads/${dirName}/`));
});

const candidates = files
  .map((filePath) => ({
    filePath,
    stat: fs.statSync(filePath),
  }))
  .filter(({ stat }) => stat.size >= thresholdBytes);

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const results = [];
for (const { filePath } of candidates) {
  const result = await inspectCandidate(filePath, settings);
  if (!result.changed) {
    continue;
  }

  if (apply) {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, result.buffer);
    try {
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      if (error?.code !== 'EPERM' && error?.code !== 'EACCES') throw error;
      fs.copyFileSync(tempPath, filePath);
      fs.unlinkSync(tempPath);
    }
  }

  results.push({
    path: result.relativePath,
    beforeBytes: result.beforeBytes,
    afterBytes: result.afterBytes,
    savedBytes: result.savedBytes,
    beforeMb: result.beforeMb,
    afterMb: result.afterMb,
    savedMb: result.savedMb,
    beforeWidth: result.beforeWidth,
    beforeHeight: result.beforeHeight,
    afterWidth: result.afterWidth,
    afterHeight: result.afterHeight,
  });
}

results.sort((a, b) => b.savedBytes - a.savedBytes);

const report = {
  generatedAt: new Date().toISOString(),
  mode: apply ? 'apply' : 'dry-run',
  settings,
  summary: {
    candidateCount: candidates.length,
    optimizedCount: results.length,
    totalBeforeBytes: results.reduce((sum, item) => sum + item.beforeBytes, 0),
    totalBeforeMb: bytesToMb(results.reduce((sum, item) => sum + item.beforeBytes, 0)),
    totalAfterBytes: results.reduce((sum, item) => sum + item.afterBytes, 0),
    totalAfterMb: bytesToMb(results.reduce((sum, item) => sum + item.afterBytes, 0)),
    totalSavedBytes: results.reduce((sum, item) => sum + item.savedBytes, 0),
    totalSavedMb: bytesToMb(results.reduce((sum, item) => sum + item.savedBytes, 0)),
  },
  results: results.slice(0, 25),
};

writeOptimizationReport(report);

console.log(
  `local-upload-optimization: ${report.mode.toUpperCase()} (${report.summary.optimizedCount}/${report.summary.candidateCount} optimized, ${report.summary.totalSavedMb} MB saved)`,
);
