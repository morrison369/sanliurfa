/**
 * SEO Content Generator for Şanlıurfa Places
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PLACES = [
  {
    id: 'balikligol',
    name: 'Balıklıgöl',
    category: 'dini',
    description: 'Şanlıurfa\'nın sembolü, kutsal balıklarıyla ünlü tarihi göl.',
    history: 'Hz. İbrahim\'in ateşe atıldığında düştüğü yer olarak bilinir.',
    lat: 37.1591, lon: 38.7969,
    address: 'Balıklıgöl Mahallesi, Haliliye/Şanlıurfa',
    hours: '24 saat', price: 'Ücretsiz',
    nearby: ['Hz. İbrahim Makamı', 'Rızvaniye Camii'],
    tags: ['tarihi', 'dini', 'göl']
  },
  {
    id: 'gobeklitepe',
    name: 'Göbeklitepe',
    category: 'tarihi',
    description: 'Dünyanın bilinen en eski tapınak merkezi, UNESCO Dünya Mirası.',
    history: 'MÖ 9600-8200 yıllarına tarihlenen Neolitik dönem tapınak kompleksi.',
    lat: 37.2231, lon: 38.9222,
    address: 'Örencik Köyü, Haliliye (Şehir merkezine 18 km)',
    hours: '08:00-18:00', price: 'Ücretli',
    nearby: ['Şanlıurfa Arkeoloji Müzesi', 'Harran'],
    tags: ['UNESCO', 'arkeoloji', 'tarih']
  },
  {
    id: 'harran',
    name: 'Harran',
    category: 'tarihi',
    description: 'Konik kubbeli evleriyle ünlü antik şehir.',
    history: '3. binyıldan beri iskan görmüş, dünyanın en eski üniversitesine ev sahipliği yapmış.',
    lat: 36.86, lon: 39.03,
    address: 'Harran, Şanlıurfa (Şehir merkezine 44 km)',
    hours: '08:00-17:30', price: 'Ücretsiz',
    nearby: ['Harran Kalesi', 'Harran Üniversitesi'],
    tags: ['antik kent', 'mimari', 'üniversite']
  }
];

function generateContent(place: typeof PLACES[0]) {
  return `---
title: "${place.name} - Şanlıurfa Gezi Rehberi | Tarihçe, Nasıl Gidilir?"
description: "${place.name}: ${place.description} Giriş ücreti, ziyaret saatleri, nasıl gidilir? 2024 güncel bilgiler."
lat: ${place.lat}
lon: ${place.lon}
category: "${place.category}"
tags: [${place.tags.map(t => `"${t}"`).join(', ')}]
address: "${place.address}"
hours: "${place.hours}"
price: "${place.price}"
---

# ${place.name}

${place.name}, ${place.description}

## Tarihçe

${place.history}

## Nerede ve Nasıl Gidilir?

Şanlıurfa şehir merkezine ${place.id === 'gobeklitepe' ? '18 km' : place.id === 'harran' ? '44 km' : 'yürüme mesafesinde'} uzaklıkta. Özel araç veya toplu taşıma ile ulaşılabilir.

## Ziyaret Bilgileri

| Bilgi | Detay |
|-------|-------|
| **Adres** | ${place.address} |
| **Ziyaret Saatleri** | ${place.hours} |
| **Giriş Ücreti** | ${place.price} |

### En İyi Ziyaret Zamanı

Şanlıurfa'yı ziyaret için en ideal dönemler **ilkbahar (Mart-Mayıs)** ve **sonbahar (Eylül-Kasım)** aylarıdır.

## Yakınında Görülecek Yerler

${place.nearby.map(p => `- **${p}**`).join('\n')}

## Sık Sorulan Sorular

### ${place.name} giriş ücreti ne kadar?
${place.price}. Öğrenci indirimi uygulanabilir.

### ${place.name} ne zaman açık?
${place.hours}. Resmi tatillerde değişiklik olabilir.

### ${place.name}'ye nasıl ulaşırım?
Şanlıurfa şehir merkezinden ${place.id === 'gobeklitepe' ? 'otobüs/taksi' : 'yürüyerek/toplu taşıma'} ile ulaşabilirsiniz.

---

*Bu içerik 2024 yılında güncellenmiştir.*
`;
}

export function generateAllContent(outputDir: string = './src/content/places') {
  console.log('📝 Generating content...\n');
  mkdirSync(outputDir, { recursive: true });
  
  for (const place of PLACES) {
    const content = generateContent(place);
    writeFileSync(join(outputDir, `${place.id}.md`), content, 'utf-8');
    console.log(`✅ ${place.name}`);
  }
  
  console.log(`\n✨ Generated ${PLACES.length} files!`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllContent('./src/content/places');
}
