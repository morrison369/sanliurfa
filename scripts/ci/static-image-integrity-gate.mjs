#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = process.cwd();
const IMAGE_ROOT = path.join(ROOT, 'public', 'images');
const REPORT_JSON = path.join(ROOT, 'docs', 'static-image-integrity-report.json');
const REPORT_MD = path.join(ROOT, 'docs', 'static-image-integrity-report.md');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const MIN_EXPECTED_BYTES = 1024;

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectImages(fullPath));
      continue;
    }

    if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function toProjectPath(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function isAllowedTinyPlaceholder(filePath) {
  const baseName = path.basename(filePath).toLowerCase();
  return baseName.includes('placeholder');
}

async function auditImage(filePath) {
  const stat = await fs.stat(filePath);
  const projectPath = toProjectPath(filePath);
  const result = {
    path: projectPath,
    bytes: stat.size,
    width: null,
    height: null,
    format: null,
    status: 'pass',
    issues: [],
  };

  try {
    const metadata = await sharp(filePath, { failOn: 'error' }).metadata();
    result.width = metadata.width ?? null;
    result.height = metadata.height ?? null;
    result.format = metadata.format ?? null;

    if (!result.width || !result.height) {
      result.status = 'fail';
      result.issues.push('missing-dimensions');
    }
  } catch (error) {
    result.status = 'fail';
    result.issues.push(`decode-error:${error instanceof Error ? error.message : String(error)}`);
    return result;
  }

  if (stat.size < MIN_EXPECTED_BYTES && !isAllowedTinyPlaceholder(filePath)) {
    result.status = 'fail';
    result.issues.push(`suspicious-small-file:<${MIN_EXPECTED_BYTES}`);
  }

  if (stat.size < MIN_EXPECTED_BYTES && isAllowedTinyPlaceholder(filePath)) {
    result.status = result.status === 'fail' ? 'fail' : 'review';
    result.issues.push('small-placeholder-allowed');
  }

  return result;
}

function buildMarkdown(report) {
  const lines = [
    '# Static Image Integrity Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Scanned images: ${report.summary.scanned}`,
    `Failed: ${report.summary.failed}`,
    `Review: ${report.summary.review}`,
    `Passed: ${report.summary.passed}`,
    '',
  ];

  if (report.failures.length) {
    lines.push('## Failures', '');
    for (const item of report.failures) {
      lines.push(`- ${item.path} (${item.bytes} bytes): ${item.issues.join(', ')}`);
    }
    lines.push('');
  }

  if (report.review.length) {
    lines.push('## Review', '');
    for (const item of report.review) {
      lines.push(`- ${item.path} (${item.bytes} bytes, ${item.width}x${item.height}): ${item.issues.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('## Policy', '');
  lines.push('- CDN veya object storage varsayimi yoktur; gate sadece `public/images` yerel dosyalarini kontrol eder.');
  lines.push('- 1 KB altindaki placeholder dosyalari, decode edilebiliyor ve boyutlari varsa review olarak kabul edilir.');
  lines.push('- Diger kucuk, bozuk veya boyutsuz gorseller release icin blocker kabul edilir.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function main() {
  if (!await pathExists(IMAGE_ROOT)) {
    throw new Error(`Image directory not found: ${toProjectPath(IMAGE_ROOT)}`);
  }

  const images = await collectImages(IMAGE_ROOT);
  const results = [];

  for (const image of images) {
    results.push(await auditImage(image));
  }

  const failures = results.filter(item => item.status === 'fail');
  const review = results.filter(item => item.status === 'review');
  const passed = results.filter(item => item.status === 'pass');
  const report = {
    generatedAt: new Date().toISOString(),
    status: failures.length ? 'fail' : 'pass',
    imageRoot: toProjectPath(IMAGE_ROOT),
    summary: {
      scanned: results.length,
      failed: failures.length,
      review: review.length,
      passed: passed.length,
    },
    failures,
    review,
    results,
  };

  await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
  await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(REPORT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    status: report.status,
    scanned: report.summary.scanned,
    failed: report.summary.failed,
    review: report.summary.review,
    report: toProjectPath(REPORT_JSON),
  }, null, 2));

  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
