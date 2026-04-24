# Ücretsiz API'ler ve Veri Kaynakları Rehberi

Bu dokümanda Şanlıurfa.com projesinde kullanabileceğiniz ücretsiz API'ler ve veri kaynakları listelenmiştir.

## 📍 Haritalar ve Coğrafi Veriler

### 1. Leaflet + OpenStreetMap (ÖNERİLEN)
**Maliyet:** Tamamen ücretsiz
```javascript
// Kurulum
npm install leaflet react-leaflet

// Kullanım
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

<MapContainer center={[37.1592, 38.7969]} zoom={13}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap'
  />
</MapContainer>
```

**Özellikler:**
- Ücretsiz katmanlar (OpenStreetMap, CartoDB, Stamen)
- Offline kullanım imkanı
- Özel tile server kurulabilir

### 2. OpenStreetMap Nominatim (Geocoding)
**Limit:** 1 saniyede 1 istek
```javascript
// Adres -> Koordinat
const response = await fetch(
  `https://nominatim.openstreetmap.org/search?format=json&q=Balıklıgöl,Şanlıurfa`
);
const data = await response.json();
```

### 3. Overpass Turbo (Özel Veri Çekme)
```javascript
// Şanlıurfa'daki tüm restoranları çek
const query = `[out:json];
area[name="Şanlıurfa"]->.searchArea;
node[amenity=restaurant](area.searchArea);
out body;`;

const response = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  body: query
});
```

## 🖼️ Görseller

### 1. Unsplash API
**Limit:** Saatte 50 istek (ücretsiz)
```javascript
// src/lib/images/unsplash.ts
const ACCESS_KEY = import.meta.env.UNSPLASH_ACCESS_KEY;

export async function searchUrfaImages(query: string, count = 10) {
  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}+sanliurfa&per_page=${count}`,
    { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } }
  );
  return response.json();
}
```

### 2. Pexels API
**Limit:** Saatte 200 istek, günlük 20,000
```javascript
const API_KEY = import.meta.env.PEXELS_API_KEY;

export async function getUrfaPhotos() {
  const response = await fetch(
    'https://api.pexels.com/v1/search?query=sanliurfa&per_page=20',
    { headers: { Authorization: API_KEY } }
  );
  return response.json();
}
```

### Şanlıurfa.com İçin Hazır Görsel Pipeline
```bash
# 1) Unsplash/Pexels'ten slug bazlı indir
npm run images:download

# 2) İçerik markdown frontmatter alanlarına otomatik bağla
npm run images:map

# 3) Görselleri DB'ye (site_media_assets) aktar
npm run images:sync-db

# Tek komutta tam akış
npm run images:pipeline:db
```

### 3. Wikimedia Commons
**Limit:** Yok
```javascript
// Göbeklitepe görselleri
const query = 'Göbeklitepe';
const response = await fetch(
  `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&origin=*`
);
```

### 4. Local Images (Kendi Sunucunuzda)
```javascript
// scripts/download-images.js
import { promises as fs } from 'fs';

// Yerel görsel optimizasyonu
export async function optimizeImage(inputPath, outputPath) {
  const sharp = await import('sharp');
  await sharp(inputPath)
    .resize(1200, 800, { fit: 'cover' })
    .webp({ quality: 85 })
    .toFile(outputPath);
}
```

## 📖 İçerik ve Bilgi

### 1. Wikipedia API
**Limit:** Yok
```javascript
// src/lib/content/wikipedia.ts
export async function getPlaceInfo(title: string) {
  const response = await fetch(
    `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  );
  const data = await response.json();
  
  return {
    title: data.title,
    description: data.description,
    content: data.extract,
    image: data.originalimage?.source,
    coordinates: data.coordinates,
  };
}
```

### 2. Wikidata
```javascript
// Şanlıurfa ile ilgili tüm entity'ler
const query = `SELECT ?item ?itemLabel WHERE {
  ?item wdt:P131 wd:Q131387.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "tr". }
}`;

const response = await fetch('https://query.wikidata.org/sparql', {
  method: 'POST',
  body: `query=${encodeURIComponent(query)}`,
  headers: { Accept: 'application/sparql-results+json' }
});
```

### 3. DBpedia
```javascript
const resource = 'http://dbpedia.org/resource/Göbekli_Tepe';
const response = await fetch(
  `https://dbpedia.org/data/${resource}.json`
);
```

## 🌤️ Hava Durumu

### Open-Meteo (Tamamen Ücretsiz)
```javascript
export async function getUrfaWeather() {
  const response = await fetch(
    'https://api.open-meteo.com/v1/forecast?latitude=37.1592&longitude=38.7969&current=temperature_2m,weather_code&timezone=Europe/Istanbul'
  );
  return response.json();
}
```

## 💱 Döviz Kuru

### TCMB (Merkez Bankası - Ücretsiz)
```javascript
export async function getExchangeRates() {
  const response = await fetch(
    'https://www.tcmb.gov.tr/kurlar/today.xml'
  );
  // XML parse et
}
```

### FreeCurrencyAPI
**Limit:** Günlük 5,000 istek
```javascript
const API_KEY = import.meta.env.CURRENCY_API_KEY;
const response = await fetch(
  `https://api.freecurrencyapi.com/v1/latest?apikey=${API_KEY}&base_currency=TRY`
);
```

## 🔍 Arama

### Meilisearch (Self-hosted - Ücretsiz)
```javascript
// Docker ile kurulum
docker run -p 7700:7700 getmeili/meilisearch

// Kullanım
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({ host: 'http://localhost:7700' });
const index = client.index('places');

await index.addDocuments(places);
const results = await index.search('kebap');
```

### Algolia (Free Tier)
**Limit:** 10,000 arama/ay
```javascript
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(APP_ID, API_KEY);
const index = client.initIndex('places');
```

## 📧 E-posta

### Resend (Free Tier)
**Limit:** Günde 100 e-posta
```javascript
import { Resend } from 'resend';

const resend = new Resend(API_KEY);

await resend.emails.send({
  from: 'noreply@sanliurfa.com',
  to: user.email,
  subject: 'Hoş Geldiniz',
  html: '<p>Şanlıurfa.com\'a hoş geldiniz!</p>',
});
```

### SendGrid (Free Tier)
**Limit:** Günde 100 e-posta

## 🔔 Push Notifications

### OneSignal (Free Tier)
```javascript
import OneSignal from '@onesignal/node-onesignal';

const client = new OneSignal.DefaultApi(app_key);
await client.createNotification({
  app_id: APP_ID,
  headings: { tr: 'Yeni Mekan' },
  contents: { tr: 'Yeni bir mekan eklendi!' },
  included_segments: ['Subscribed Users'],
});
```

## 📊 Analytics

### Umami (Self-hosted - Ücretsiz)
```javascript
// Kurulum
docker run -d \
  --name umami \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  ghcr.io/umami-software/umami

// Web sitesine ekle
<script async src="https://analytics.sanliurfa.com/script.js" data-website-id="..."></script>
```

### Plausible (Self-hosted)
```javascript
// Docker Compose ile kurulum
docker run -d \
  --name plausible \
  -p 8000:8000 \
  plausible/analytics
```

## 🤖 AI/ML (Ücretsiz Tier)

### Hugging Face Inference API
**Limit:** Rate limit var
```javascript
export async function generateDescription(placeName: string) {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/dbmdz/bert-base-turkish-cased',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ inputs: placeName }),
    }
  );
  return response.json();
}
```

### Ollama (Local - Tamamen Ücretsiz)
```javascript
// Yerel AI modeli çalıştırma
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: 'llama2',
    prompt: `Şanlıurfa'daki ${placeName} hakkında kısa bilgi yaz.`,
  }),
});
```

## 🗄️ Database

### Supabase (Free Tier)
**Limit:** 500MB DB, 1GB bant genişliği/ay
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, ANON_KEY);

// Places tablosu
const { data } = await supabase
  .from('places')
  .select('*')
  .eq('category', 'restoran');
```

### Neon (Free Tier)
**Limit:** 500MB storage

### Railway (Free Tier)
**Limit:** $5 credit/ay

### PlanetScale (Free Tier)
**Limit:** 5GB storage, 1 billion rows

## ☁️ CDN ve Hosting

### Cloudflare (Free Tier)
- CDN
- DDoS koruması
- Analytics
- Workers (100,000 istek/gün)

### GitHub Pages (Ücretsiz)
Statik site hosting

### Vercel (Hobby Tier)
- Serverless functions
- Edge network
- Analytics

### Netlify (Starter Tier)
- 100GB bant genişliği/ay
- Form handling
- Identity

## 🔒 Authentication

### Lucia Auth (Self-hosted)
```javascript
import { lucia } from 'lucia';

const auth = lucia({
  adapter: prismaAdapter(prisma),
  env: import.meta.env.DEV ? 'DEV' : 'PROD',
});
```

### Auth.js (Next-Auth)
```javascript
import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';

export const handle = SvelteKitAuth({
  providers: [Google({ clientId: GOOGLE_ID, clientSecret: GOOGLE_SECRET })],
});
```

## 📝 CMS

### Strapi (Self-hosted)
```javascript
// Docker ile kurulum
docker run -p 1337:1337 strapi/strapi
```

### Directus (Self-hosted)
```javascript
docker run -p 8055:8055 directus/directus
```

### Payload CMS
Next.js/Astro ile entegre

## 🧪 Test

### Playwright (Ücretsiz)
```javascript
// E2E testing
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Şanlıurfa/);
});
```

### Vitest (Ücretsiz)
```javascript
// Unit testing
import { test, expect } from 'vitest';

test('sum', () => {
  expect(1 + 1).toBe(2);
});
```

## 🎨 UI Component Libraries

### Shadcn/ui (Ücretsiz)
```bash
npx shadcn add button
npx shadcn add card
```

### Radix UI (Ücretsiz)
Accessible primitives

### Headless UI (Ücretsiz)
Tailwind için

## 📱 PWA

### Vite PWA (Ücretsiz)
```javascript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Şanlıurfa Rehberi',
        /* ... */
      },
    }),
  ],
};
```

## 📋 Önerilen Stack (Tamamen Ücretsiz)

| Bileşen | Seçim |
|---------|-------|
| Frontend | Astro + React + Tailwind |
| Backend | Astro API Routes + Node.js |
| Database | Supabase (PostgreSQL) |
| Auth | Lucia Auth |
| Search | Meilisearch (self-hosted) |
| Maps | Leaflet + OpenStreetMap |
| Images | Unsplash API + Local |
| Email | Resend |
| Analytics | Umami (self-hosted) |
| Hosting | Vercel + Cloudflare |
| CDN | Cloudflare |

## 💡 Tasarruf İpuçları

1. **Görseller:** WebP formatında, lazy loading ile
2. **API Cache:** Redis veya in-memory cache kullan
3. **Rate Limiting:** Kendi limitlerini belirle
4. **Static Generation:** Build time'da sayfaları oluştur
5. **Edge Functions:** Vercel/Cloudflare edge'de çalıştır

## 🔗 Faydalı Linkler

- [Public APIs GitHub](https://github.com/public-apis/public-apis)
- [OpenStreetMap Wiki](https://wiki.openstreetmap.org/)
- [Wikimedia API Docs](https://www.mediawiki.org/wiki/API:Main_page)
- [Awesome Self-hosted](https://github.com/awesome-selfhosted/awesome-selfhosted)
