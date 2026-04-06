#!/usr/bin/env node
// Final pre-deployment check

import fs from 'fs';

console.log('🔍 Final Pre-Deployment Check\n');

let issues = 0;

// Check 1: Environment variables
console.log('1️⃣  Environment Variables');
const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
requiredEnv.forEach(key => {
  if (envFile.includes(key)) {
    console.log(`  ✅ ${key}`);
  } else {
    console.log(`  ⚠️  ${key} missing in .env`);
    issues++;
  }
});

// Check 2: Build output
console.log('\n2️⃣  Build Output');
if (fs.existsSync('dist')) {
  const stats = fs.statSync('dist');
  console.log(`  ✅ dist/ exists (${new Date(stats.mtime).toLocaleString()})`);
  
  // Check critical files
  const criticalFiles = [
    'dist/server/entry.mjs',
    'dist/client/_astro',
  ];
  
  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} missing`);
      issues++;
    }
  });
} else {
  console.log('  ❌ dist/ not found - Run npm run build');
  issues++;
}

// Check 3: Package.json scripts
console.log('\n3️⃣  NPM Scripts');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build', 'dev', 'preview'];
requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`  ✅ ${script}`);
  } else {
    console.log(`  ❌ ${script} missing`);
    issues++;
  }
});

// Check 4: Dependencies
console.log('\n4️⃣  Dependencies');
const criticalDeps = ['astro', '@supabase/supabase-js', 'react'];
criticalDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies?.[dep]) {
    console.log(`  ✅ ${dep}`);
  } else {
    console.log(`  ⚠️  ${dep} not in dependencies`);
    issues++;
  }
});

// Check 5: Security files
console.log('\n5️⃣  Security & Config');
const securityFiles = ['.gitignore', '.dockerignore'];
securityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} missing`);
  }
});

// Summary
console.log('\n📊 Summary');
if (issues === 0) {
  console.log('✅ All checks passed! Ready for deployment.');
  process.exit(0);
} else {
  console.log(`⚠️  ${issues} issue(s) found. Please fix before deployment.`);
  process.exit(1);
}
