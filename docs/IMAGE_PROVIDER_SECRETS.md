# Image Provider Secrets

Şanlıurfa içerik görselleri için Pexels ve Unsplash sağlayıcıları kullanılacak.

## Kesin Kural

- Kullanıcıdan bu keyler tekrar istenmeyecek.
- Gerçek key değerleri tracked dosyalara, dokümana, kaynak koda veya commit geçmişine yazılmayacak.
- Local çalışma için değerler `.env.local` dosyasında tutulur; bu dosya `.gitignore` kapsamındadır.
- Production/CWP ortamında değerler domain kullanıcısının environment/secret ayarlarına girilir.
- Görsel dosya adları içerik slug değerine göre üretilir.

## Environment Değişkenleri

```env
PEXELS_API_KEY=your_pexels_api_key
UNSPLASH_APPLICATION_ID=your_unsplash_application_id
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key
```

## Kullanım Notu

Astro SSR ve API route kodları bu değerleri server tarafında `process.env` üzerinden okumalıdır. Client bundle içine secret değerleri aktarılmayacak.

## Runtime Entegrasyon

- Merkezi servis: `src/lib/image-providers.ts`
- Admin API: `POST /api/admin/images/fetch`
- Eksik mekan görselleri için script: `npm run images:places:fill -- --limit=20` dry-run yapar.
- DB ve dosya güncellemesi için açık onaylı mod: `npm run images:places:fill -- --limit=20 --write`
- Mekan+blog+etkinlik toplu tarama: `npm run images:content:fill`
- Kategori bazlı tarama: `npm run images:content:fill:places`, `npm run images:content:fill:blog`, `npm run images:content:fill:events`
- JSON rapor üretimi: `npm run images:content:fill:report` -> `.tmp/image-fill-report.json`
- İki aşamalı otomatik akış (dry-run + write + ayrı rapor): `npm run images:content:pipeline`
- Gelişmiş arama fallback için: `--query-mode=expanded` (başlık + kategori + slug kelimeleri)
- Env yoksa komut satırından bağlantı verilebilir: `--database-url=postgresql://...`
- Kaydedilen dosyalar slug bazlıdır: `/uploads/photos/provider/{pexels|unsplash}/{folder}/{slug}.webp`
- İndirilen sağlayıcı görselleri `sharp` ile 1600x1000 sınırında, büyütmeden, WebP kalite 82 olarak optimize edilir.
