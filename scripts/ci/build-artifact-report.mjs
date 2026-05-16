#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distClientDir = path.join(root, 'dist', 'client');
const astroDir = path.join(distClientDir, '_astro');
const publicUploadsDir = path.join(root, 'public', 'uploads');
const publicImagesDir = path.join(root, 'public', 'images');
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'build-artifact-report.json');
const outMd = path.join(docsDir, 'build-artifact-report.md');

const budgets = {
  distClientSoftMaxBytes: 260 * 1024 * 1024,
  astroCssMaxBytes: 400 * 1024,
  astroJsMaxBytesTotal: 1900 * 1024,
  astroJsMaxChunks: 130,
};

function listFiles(dir, bucket = []) {
  if (!fs.existsSync(dir)) return bucket;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(absolute, bucket);
      continue;
    }
    if (entry.isFile()) {
      const size = fs.statSync(absolute).size;
      bucket.push({
        path: absolute,
        relativePath: path.relative(root, absolute).replace(/\\/g, '/'),
        size,
      });
    }
  }
  return bucket;
}

function bytesToMb(bytes) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

function summarizeImmediateChildren(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .map((entry) => {
      const absolute = path.join(dir, entry.name);
      const files = entry.isDirectory() ? listFiles(absolute, []) : [{
        path: absolute,
        relativePath: path.relative(root, absolute).replace(/\\/g, '/'),
        size: fs.statSync(absolute).size,
      }];
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      return {
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        bytes: totalBytes,
        mb: bytesToMb(totalBytes),
        fileCount: files.length,
      };
    })
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 12);
}

function summarizeByExtension(files) {
  const bucket = new Map();
  for (const file of files) {
    const ext = path.extname(file.relativePath || file.path).toLowerCase() || '[no-ext]';
    const current = bucket.get(ext) || { extension: ext, bytes: 0, fileCount: 0 };
    current.bytes += file.size;
    current.fileCount += 1;
    bucket.set(ext, current);
  }

  return Array.from(bucket.values())
    .map((entry) => ({
      ...entry,
      mb: bytesToMb(entry.bytes),
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 12);
}

function summarizeAstroAssets() {
  if (!fs.existsSync(astroDir)) {
    return {
      exists: false,
      cssBytes: 0,
      cssMb: 0,
      cssCount: 0,
      jsBytes: 0,
      jsMb: 0,
      jsCount: 0,
      withinBudget: false,
    };
  }

  const files = fs.readdirSync(astroDir);
  const cssFiles = files.filter((entry) => entry.endsWith('.css'));
  const jsFiles = files.filter((entry) => entry.endsWith('.js'));
  const cssBytes = cssFiles.reduce((sum, file) => sum + fs.statSync(path.join(astroDir, file)).size, 0);
  const jsBytes = jsFiles.reduce((sum, file) => sum + fs.statSync(path.join(astroDir, file)).size, 0);

  return {
    exists: true,
    cssBytes,
    cssMb: bytesToMb(cssBytes),
    cssCount: cssFiles.length,
    jsBytes,
    jsMb: bytesToMb(jsBytes),
    jsCount: jsFiles.length,
    withinBudget:
      cssBytes <= budgets.astroCssMaxBytes &&
      jsBytes <= budgets.astroJsMaxBytesTotal &&
      jsFiles.length <= budgets.astroJsMaxChunks,
  };
}

const distExists = fs.existsSync(distClientDir);
const allFiles = distExists ? listFiles(distClientDir, []) : [];
const totalBytes = allFiles.reduce((sum, file) => sum + file.size, 0);
const astroAssets = summarizeAstroAssets();
const publicUploadsFiles = listFiles(publicUploadsDir, []);
const publicUploadsBytes = publicUploadsFiles.reduce((sum, file) => sum + file.size, 0);
const oversizedUploads = publicUploadsFiles.filter((file) => file.size >= 1024 * 1024);
const publicImagesFiles = listFiles(publicImagesDir, []);
const publicImagesBytes = publicImagesFiles.reduce((sum, file) => sum + file.size, 0);
const oversizedStaticImages = publicImagesFiles.filter((file) => file.size >= 300 * 1024);

const report = {
  generatedAt: new Date().toISOString(),
  status: distExists ? 'ok' : 'missing',
  budgets,
  distClient: {
    exists: distExists,
    totalBytes,
    totalMb: bytesToMb(totalBytes),
    totalFiles: allFiles.length,
    withinSoftBudget: totalBytes <= budgets.distClientSoftMaxBytes,
    topChildren: summarizeImmediateChildren(distClientDir),
    largestFiles: allFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 15)
      .map((file) => ({
        path: file.relativePath,
        bytes: file.size,
        mb: bytesToMb(file.size),
      })),
  },
  publicUploads: {
    exists: fs.existsSync(publicUploadsDir),
    totalBytes: publicUploadsBytes,
    totalMb: bytesToMb(publicUploadsBytes),
    totalFiles: publicUploadsFiles.length,
    oversizedFileCount: oversizedUploads.length,
    topChildren: summarizeImmediateChildren(publicUploadsDir),
    byExtension: summarizeByExtension(publicUploadsFiles),
    oversizedFiles: oversizedUploads
      .sort((a, b) => b.size - a.size)
      .slice(0, 20)
      .map((file) => ({
        path: file.relativePath,
        bytes: file.size,
        mb: bytesToMb(file.size),
      })),
    largestFiles: publicUploadsFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map((file) => ({
        path: file.relativePath,
        bytes: file.size,
        mb: bytesToMb(file.size),
    })),
  },
  publicImages: {
    exists: fs.existsSync(publicImagesDir),
    totalBytes: publicImagesBytes,
    totalMb: bytesToMb(publicImagesBytes),
    totalFiles: publicImagesFiles.length,
    oversizedFileCount: oversizedStaticImages.length,
    topChildren: summarizeImmediateChildren(publicImagesDir),
    byExtension: summarizeByExtension(publicImagesFiles),
    oversizedFiles: oversizedStaticImages
      .sort((a, b) => b.size - a.size)
      .slice(0, 20)
      .map((file) => ({
        path: file.relativePath,
        bytes: file.size,
        mb: bytesToMb(file.size),
      })),
  },
  astroAssets,
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Build Artifact Report',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Status: ${report.status}`,
  `- dist/client total: ${report.distClient.totalMb} MB (${report.distClient.totalFiles} file)`,
  `- dist/client soft budget (260 MB): ${report.distClient.withinSoftBudget ? 'ok' : 'over'}`,
  `- public/uploads snapshot: ${report.publicUploads.totalMb} MB (${report.publicUploads.totalFiles} file)`,
  `- public/uploads oversized files (>=1 MB): ${report.publicUploads.oversizedFileCount}`,
  `- public/images snapshot: ${report.publicImages.totalMb} MB (${report.publicImages.totalFiles} file)`,
  `- public/images oversized files (>=300 KB): ${report.publicImages.oversizedFileCount}`,
  `- _astro bundle budget: ${report.astroAssets.withinBudget ? 'ok' : 'review'}`,
  '',
  '## dist/client Top Children',
  '',
  '| Entry | Type | Size (MB) | File Count |',
  '|---|---|---:|---:|',
  ...report.distClient.topChildren.map((entry) =>
    `| ${entry.name} | ${entry.type} | ${entry.mb} | ${entry.fileCount} |`,
  ),
  '',
  '## Largest Files',
  '',
  '| Path | Size (MB) |',
  '|---|---:|',
  ...report.distClient.largestFiles.map((file) => `| \`${file.path}\` | ${file.mb} |`),
  '',
  '## public/uploads Top Children',
  '',
  '| Entry | Type | Size (MB) | File Count |',
  '|---|---|---:|---:|',
  ...report.publicUploads.topChildren.map((entry) =>
    `| ${entry.name} | ${entry.type} | ${entry.mb} | ${entry.fileCount} |`,
  ),
  '',
  '## public/uploads Largest Files',
  '',
  '| Path | Size (MB) |',
  '|---|---:|',
  ...report.publicUploads.largestFiles.map((file) => `| \`${file.path}\` | ${file.mb} |`),
  '',
  '## public/uploads Oversized Files (>=1 MB)',
  '',
  '| Path | Size (MB) |',
  '|---|---:|',
  ...report.publicUploads.oversizedFiles.map((file) => `| \`${file.path}\` | ${file.mb} |`),
  '',
  '## public/uploads By Extension',
  '',
  '| Extension | Size (MB) | File Count |',
  '|---|---:|---:|',
  ...report.publicUploads.byExtension.map((entry) => `| \`${entry.extension}\` | ${entry.mb} | ${entry.fileCount} |`),
  '',
  '## public/images Top Children',
  '',
  '| Entry | Type | Size (MB) | File Count |',
  '|---|---|---:|---:|',
  ...report.publicImages.topChildren.map((entry) =>
    `| ${entry.name} | ${entry.type} | ${entry.mb} | ${entry.fileCount} |`,
  ),
  '',
  '## public/images Oversized Files (>=300 KB)',
  '',
  '| Path | Size (MB) |',
  '|---|---:|',
  ...report.publicImages.oversizedFiles.map((file) => `| \`${file.path}\` | ${file.mb} |`),
  '',
  '## public/images By Extension',
  '',
  '| Extension | Size (MB) | File Count |',
  '|---|---:|---:|',
  ...report.publicImages.byExtension.map((entry) => `| \`${entry.extension}\` | ${entry.mb} | ${entry.fileCount} |`),
  '',
  '## _astro Snapshot',
  '',
  `- CSS: ${report.astroAssets.cssMb} MB (${report.astroAssets.cssCount} file)`,
  `- JS: ${report.astroAssets.jsMb} MB (${report.astroAssets.jsCount} chunk)`,
  `- Budget result: ${report.astroAssets.withinBudget ? 'ok' : 'review'}`,
  '',
];

fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');

console.log(`build-artifact-report: ${report.status.toUpperCase()} (${report.distClient.totalMb} MB)`);
