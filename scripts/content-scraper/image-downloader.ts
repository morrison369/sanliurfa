/**
 * Free Image Downloader (Unsplash/Pexels)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import https from 'https';

const QUERIES = [
  'Sanliurfa Turkey', 'Balikligol Urfa', 'Gobeklitepe', 
  'Harran Turkey', 'Southeast Turkey', 'Mesopotamia landscape'
];

async function fetchUnsplash(query: string) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const res = await fetch(url, { headers: { 'Authorization': `Client-ID ${key}` } });
    const data = await res.json();
    return data.results.map((img: any) => ({
      id: `unsplash-${img.id}`,
      url: img.urls.regular,
      thumb: img.urls.small,
      author: img.user.name,
      source: 'Unsplash'
    }));
  } catch (e) { return []; }
}

function download(url: string, path: string) {
  return new Promise((resolve, reject) => {
    if (existsSync(path)) { console.log(`  ⏭️ Exists`); resolve(null); return; }
    https.get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { writeFileSync(path, Buffer.concat(chunks)); resolve(null); });
    }).on('error', reject);
  });
}

export async function downloadImages(outputDir: string = './public/images/places') {
  console.log('🖼️ Downloading images...\n');
  mkdirSync(outputDir, { recursive: true });
  
  for (const query of QUERIES) {
    console.log(`🔍 ${query}`);
    const images = await fetchUnsplash(query);
    
    for (const img of images.slice(0, 2)) {
      try {
        const path = join(outputDir, `${img.id}.jpg`);
        console.log(`  ⬇️ ${img.id}`);
        await download(img.url, path);
      } catch (e) { console.error(`  ❌ Failed`); }
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n✨ Done!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  downloadImages();
}
