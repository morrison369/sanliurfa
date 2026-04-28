/**
 * Wikipedia Content Scraper for Şanlıurfa
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PLACES = [
  { tr: 'Balıklıgöl', en: 'Balıklıgöl' },
  { tr: 'Göbeklitepe', en: 'Göbekli_Tepe' },
  { tr: 'Harran', en: 'Harran' },
  { tr: 'Halfeti', en: 'Halfeti' },
];

async function fetchWikipedia(title: string) {
  try {
    const url = `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${title}:`, error);
    return null;
  }
}

function saveAsMarkdown(data: any, outputDir: string) {
  const slug = data.title.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  const content = `---
title: "${data.title}"
description: "${data.extract?.substring(0, 150)}..."
${data.coordinates ? `lat: ${data.coordinates.lat}\nlon: ${data.coordinates.lon}` : ''}
category: "tarihi-yer"
---

# ${data.title}

${data.extract}

## Ziyaret Bilgileri

- **Adres**: [Adres eklenecek]
- **Giriş Saatleri**: 24 saat (veya belirtilen saatler)
- **Giriş Ücreti**: Ücretsiz

*Kaynak: Wikipedia*
`;
  
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, `${slug}.md`), content, 'utf-8');
  console.log(`✅ Saved: ${data.title}`);
}

export async function scrapeAllPlaces(outputDir: string = './content/places') {
  console.log('🚀 Scraping Wikipedia...\n');
  
  for (const place of PLACES) {
    console.log(`📥 Fetching: ${place.tr}`);
    const data = await fetchWikipedia(place.tr);
    if (data) saveAsMarkdown(data, outputDir);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n✨ Done!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllPlaces('./src/content/places');
}
