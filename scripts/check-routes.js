#!/usr/bin/env node
// Route checker - Verify all routes are accessible

import fs from 'fs';
import path from 'path';

const ROUTES = [
  '/',
  '/places',
  '/tarihi-yerler',
  '/gastronomi',
  '/etkinlikler',
  '/blog',
  '/hakkinda',
  '/iletisim',
  '/arama',
  '/giris',
  '/kayit',
  '/profil',
  '/admin',
];

const PAGES_DIR = './src/pages';

function checkRoute(route) {
  // Convert route to file path
  let filePath = route === '/' ? 'index.astro' : route.slice(1) + '.astro';
  
  // Check for dynamic routes
  const parts = filePath.split('/');
  if (parts.length > 1) {
    const dirPath = path.join(PAGES_DIR, parts[0]);
    if (fs.existsSync(dirPath)) {
      // Check for index.astro in directory
      if (fs.existsSync(path.join(dirPath, 'index.astro'))) {
        return { exists: true, type: 'directory' };
      }
      // Check for dynamic route
      if (fs.readdirSync(dirPath).some(f => f.includes('['))) {
        return { exists: true, type: 'dynamic' };
      }
    }
  }
  
  const fullPath = path.join(PAGES_DIR, filePath);
  return { exists: fs.existsSync(fullPath), type: 'file' };
}

console.log('🛣️  Route Check\n');

let passed = 0;
let failed = 0;

ROUTES.forEach(route => {
  const result = checkRoute(route);
  const icon = result.exists ? '✅' : '❌';
  console.log(`${icon} ${route} (${result.type})`);
  if (result.exists) passed++;
  else failed++;
});

console.log(`\n📊 ${passed}/${ROUTES.length} routes OK`);
if (failed > 0) {
  console.log(`⚠️  ${failed} routes missing`);
  process.exit(1);
}
