#!/usr/bin/env node
/**
 * Görsel Optimizasyon Scripti
 * JPG/PNG -> WebP dönüşümü
 * Kullanım: node scripts/convert-to-webp.js
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  quality: 85,
  effort: 4,
  inputDir: './public/images',
  outputDir: './public/images',
  sizes: [
    { suffix: '-thumb', width: 400 },
    { suffix: '-card', width: 800 },
    { suffix: '-hero', width: 1920 }
  ]
};

async function getImageFiles(dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await getImageFiles(fullPath));
    } else if (/\.(jpg|jpeg|png)$/i.test(item.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function convertToWebp(inputPath) {
  try {
    const dir = path.dirname(inputPath);
    const basename = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(dir, `${basename}.webp`);
    
    // Ana WebP
    await sharp(inputPath)
      .webp({ 
        quality: CONFIG.quality, 
        effort: CONFIG.effort,
        smartSubsample: true 
      })
      .toFile(outputPath);
    
    const originalStats = await fs.stat(inputPath);
    const webpStats = await fs.stat(outputPath);
    const savings = ((originalStats.size - webpStats.size) / originalStats.size * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(inputPath)} -> ${basename}.webp (${savings}% daha küçük)`);
    
    // Responsive boyutlar
    for (const size of CONFIG.sizes) {
      const sizedOutput = path.join(dir, `${basename}${size.suffix}.webp`);
      await sharp(inputPath)
        .resize(size.width, null, { withoutEnlargement: true })
        .webp({ quality: CONFIG.quality })
        .toFile(sizedOutput);
      console.log(`   📐 ${size.suffix}: ${size.width}px`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Hata: ${inputPath} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🖼️  WebP Dönüşüm Başlıyor...\n');
  
  try {
    const images = await getImageFiles(CONFIG.inputDir);
    console.log(`📁 ${images.length} görsel bulundu\n`);
    
    let success = 0;
    let failed = 0;
    
    for (const image of images) {
      if (await convertToWebp(image)) {
        success++;
      } else {
        failed++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 ÖZET');
    console.log('='.repeat(50));
    console.log(`✅ Başarılı: ${success}`);
    console.log(`❌ Başarısız: ${failed}`);
    console.log(`📁 Toplam: ${images.length}`);
    console.log('\n💡 Not: Orijinal JPG/PNG dosyaları korundu.');
    console.log('   WebP versiyonları yanında oluşturuldu.');
    
  } catch (error) {
    console.error('❌ Kritik hata:', error);
    process.exit(1);
  }
}

main();
