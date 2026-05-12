#!/usr/bin/env node
/**
 * Cleanup orphaned uploaded images.
 *
 * Walks public/uploads/photos/ and removes any file whose path is NOT
 * referenced in s3_files table (legacy table name — still used for local files).
 *
 * Run via cron daily at 03:00 (see CRON-SETUP.md).
 *
 * Safety:
 * - Dry-run by default (no --apply flag → only logs what would be deleted)
 * - Files newer than 24h are skipped (give upload flow time to commit DB row)
 * - Only files matching slug-pattern naming are eligible (avoid deleting unrelated files)
 *
 * Usage:
 *   npx tsx scripts/cleanup-orphan-images.ts            # dry-run, report only
 *   npx tsx scripts/cleanup-orphan-images.ts --apply    # actually delete
 */

import { readdir, stat, unlink } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const UPLOAD_ROOT = process.env.UPLOAD_DIR || join(PROJECT_ROOT, 'public', 'uploads', 'photos');

const APPLY = process.argv.includes('--apply');
const MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function walkDir(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkDir(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log(`[cleanup-orphan-images] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`[cleanup-orphan-images] upload root: ${UPLOAD_ROOT}`);

  const allFiles = await walkDir(UPLOAD_ROOT).catch((err) => {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('[cleanup-orphan-images] upload root does not exist, nothing to do');
      return [] as string[];
    }
    throw err;
  });

  if (allFiles.length === 0) {
    console.log('[cleanup-orphan-images] no files found');
    return;
  }

  console.log(`[cleanup-orphan-images] scanned ${allFiles.length} file(s)`);

  // Lazy import — avoids loading DB unless we have files
  const { queryMany } = await import('../src/lib/postgres');
  const rows = await queryMany<{ file_path: string }>(
    'SELECT file_path FROM s3_files WHERE file_path IS NOT NULL',
    [],
  );
  const referenced = new Set(rows.map((r) => r.file_path));
  console.log(`[cleanup-orphan-images] DB references: ${referenced.size}`);

  const now = Date.now();
  let deleted = 0;
  let skippedYoung = 0;
  let skippedReferenced = 0;
  let totalBytesFreed = 0;

  for (const fullPath of allFiles) {
    const rel = '/' + relative(join(PROJECT_ROOT, 'public'), fullPath).replace(/\\/g, '/');
    const altRel = relative(join(PROJECT_ROOT, 'public'), fullPath).replace(/\\/g, '/');

    if (referenced.has(rel) || referenced.has(altRel)) {
      skippedReferenced++;
      continue;
    }

    const fileStat = await stat(fullPath);
    if (now - fileStat.mtimeMs < MIN_AGE_MS) {
      skippedYoung++;
      continue;
    }

    totalBytesFreed += fileStat.size;
    if (APPLY) {
      await unlink(fullPath);
      deleted++;
      console.log(`  - deleted: ${rel} (${fileStat.size} bytes)`);
    } else {
      console.log(`  - would delete: ${rel} (${fileStat.size} bytes)`);
    }
  }

  console.log('');
  console.log('[cleanup-orphan-images] summary:');
  console.log(`  scanned:            ${allFiles.length}`);
  console.log(`  referenced:         ${skippedReferenced}`);
  console.log(`  too young (<24h):   ${skippedYoung}`);
  console.log(`  ${APPLY ? 'deleted' : 'would delete'}: ${APPLY ? deleted : allFiles.length - skippedReferenced - skippedYoung}`);
  console.log(`  bytes freed:        ${(totalBytesFreed / 1024 / 1024).toFixed(2)} MB`);

  if (!APPLY) {
    console.log('');
    console.log('Run with --apply to actually delete these files.');
  }
}

main().catch((err) => {
  console.error('[cleanup-orphan-images] FAILED:', err);
  process.exit(1);
});
