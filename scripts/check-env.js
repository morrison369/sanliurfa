#!/usr/bin/env node
/**
 * Environment Configuration Checker
 * Production öncesi gerekli değişkenleri kontrol eder
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const requiredVars = [
  { key: 'DATABASE_URL', description: 'PostgreSQL bağlantı URL' },
  { key: 'JWT_SECRET', description: 'JWT imzalama anahtarı', minLength: 32 },
];

const optionalVars = [
  { key: 'REDIS_URL', description: 'Redis cache (opsiyonel)' },
  { key: 'SMTP_HOST', description: 'Email sunucu' },
  { key: 'GOOGLE_MAPS_API_KEY', description: 'Harita API anahtarı' },
];

const warnings = [];
const errors = [];

console.log('🔍 Ortam Değişkenleri Kontrolü\n');

// .env dosyası kontrolü
const envPath = join(process.cwd(), '.env');
if (!existsSync(envPath)) {
  errors.push('.env dosyası bulunamadı!');
} else {
  const envContent = readFileSync(envPath, 'utf-8');
  
  // Gerekli değişkenleri kontrol et
  for (const variable of requiredVars) {
    const regex = new RegExp(`^${variable.key}=.+`, 'm');
    if (!regex.test(envContent)) {
      errors.push(`${variable.key} tanımlanmamış: ${variable.description}`);
    } else if (variable.minLength) {
      const value = envContent.match(new RegExp(`^${variable.key}=(.+)$`, 'm'))?.[1];
      if (value && value.length < variable.minLength) {
        errors.push(`${variable.key} çok kısa (min ${variable.minLength} karakter)`);
      }
    }
  }
  
  // Opsiyonel değişkenleri kontrol et
  for (const variable of optionalVars) {
    const regex = new RegExp(`^${variable.key}=.+`, 'm');
    if (!regex.test(envContent)) {
      warnings.push(`${variable.key} tanımlanmamış: ${variable.description}`);
    }
  }
  
  // NODE_ENV kontrolü
  if (!envContent.match(/^NODE_ENV=production/m)) {
    warnings.push('NODE_ENV=production olarak ayarlanmamış');
  }
  
  // JWT_SECRET güvenlik kontrolü
  const jwtSecret = envContent.match(/^JWT_SECRET=(.+)$/m)?.[1];
  if (jwtSecret && jwtSecret.includes('your-secret')) {
    errors.push('JWT_SECRET varsayılan değeri değiştirilmemiş!');
  }
}

// Sonuçları göster
console.log('❌ Hatalar:');
if (errors.length === 0) {
  console.log('  ✅ Hata yok\n');
} else {
  errors.forEach(e => console.log(`  • ${e}`));
  console.log('');
}

console.log('⚠️  Uyarılar:');
if (warnings.length === 0) {
  console.log('  ✅ Uyarı yok\n');
} else {
  warnings.forEach(w => console.log(`  • ${w}`));
  console.log('');
}

// Çıkış kodu
if (errors.length > 0) {
  console.log('❌ Lütfen yukarıdaki hataları düzeltin.\n');
  process.exit(1);
} else {
  console.log('✅ Tüm zorunlu değişkenler tanımlanmış.\n');
  process.exit(0);
}
