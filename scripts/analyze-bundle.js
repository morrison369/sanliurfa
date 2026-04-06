#!/usr/bin/env node
// Bundle size analyzer

import fs from 'fs';
import path from 'path';

const DIST_DIR = './dist/client/_astro';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeDirectory(dir) {
  const files = fs.readdirSync(dir);
  const stats = {
    js: { count: 0, size: 0 },
    css: { count: 0, size: 0 },
    other: { count: 0, size: 0 }
  };

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      const ext = path.extname(file);
      const size = stat.size;
      
      if (ext === '.js') {
        stats.js.count++;
        stats.js.size += size;
      } else if (ext === '.css') {
        stats.css.count++;
        stats.css.size += size;
      } else {
        stats.other.count++;
        stats.other.size += size;
      }
    }
  });

  return stats;
}

console.log('📦 Bundle Size Analysis\n');

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Build directory not found. Run npm run build first.');
  process.exit(1);
}

const stats = analyzeDirectory(DIST_DIR);
const totalSize = stats.js.size + stats.css.size + stats.other.size;

console.log(`JavaScript:`);
console.log(`  Files: ${stats.js.count}`);
console.log(`  Size: ${formatBytes(stats.js.size)}`);

console.log(`\nCSS:`);
console.log(`  Files: ${stats.css.count}`);
console.log(`  Size: ${formatBytes(stats.css.size)}`);

console.log(`\nOther:`);
console.log(`  Files: ${stats.other.count}`);
console.log(`  Size: ${formatBytes(stats.other.size)}`);

console.log(`\n📊 Total: ${formatBytes(totalSize)}`);

// Performance budget check
const BUDGET = 500 * 1024; // 500KB
if (totalSize > BUDGET) {
  console.log(`\n⚠️  WARNING: Bundle size exceeds budget (${formatBytes(BUDGET)})`);
} else {
  console.log(`\n✅ Bundle size within budget (${formatBytes(BUDGET)})`);
}
