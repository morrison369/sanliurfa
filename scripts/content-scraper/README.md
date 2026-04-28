# Content Scraper for Şanlıurfa

İçerik ve resim çekme araçları.

## Kullanım

### 1. Wikipedia'dan İçerik Çekme

```bash
npx tsx scripts/content-scraper/wikipedia-scraper.ts
```

### 2. Ücretsiz Resim İndirme

```bash
# .env dosyasında UNSPLASH_ACCESS_KEY ve/veya PEXELS_API_KEY tanımla
# key doğrulaması
npm run images:check-keys
# Opsiyonel throttle/retry:
# IMAGE_REQUEST_DELAY_MS=350
# IMAGE_MAX_RETRIES=3
# IMAGE_RETRY_BASE_MS=600
npm run images:download
# İçeriğe otomatik bağla
npm run images:map
# Manifest'i DB'ye aktar (site_media_assets)
npm run images:sync-db
# Tam zincir
npm run images:pipeline
# Tam zincir + DB aktarımı
npm run images:pipeline:db
```

İndirilen dosyalar `public/images/{places|blog}/` altında slug bazlı tutulur.
`public/images/image-manifest.json` içinde kaynak/lisans/atıf kayıtları yazılır.
`images:sync-db` komutu manifest kayıtlarını `site_media_assets` tablosuna
`content.{bucket}.{slug}` anahtarıyla upsert eder.
`images:quality` komutu çözünürlük ve dosya boyutu kalite gate'ini uygular.

Opsiyonel parametreler:

```bash
# Sadece bir bucket aktar
npx tsx scripts/content-scraper/import-image-manifest-to-site-media.ts --bucket places

# Dry-run
npx tsx scripts/content-scraper/import-image-manifest-to-site-media.ts --dry-run

# Anahtar prefix override
npx tsx scripts/content-scraper/import-image-manifest-to-site-media.ts --prefix media
```

### 3. SEO İçeriği Oluşturma

```bash
npx tsx scripts/content-scraper/content-generator.ts
```

## API Key Alma

### Unsplash
1. https://unsplash.com/developers adresine git
2. "Join as a Developer" butonuna tıkla
3. Yeni uygulama oluştur
4. Access Key'i kopyala

### Pexels
1. https://www.pexels.com/api/ adresine git
2. API key başvurusu yap
3. `PEXELS_API_KEY` olarak ekle

## Ücretsiz Resim Kaynakları

- **Unsplash**: https://unsplash.com (API ile)
- **Pexels**: https://pexels.com (API ile)
- **Pixabay**: https://pixabay.com
- **Wikimedia Commons**: https://commons.wikimedia.org

## Güvenlik Notu

- API anahtarlarını repoya commit etmeyin.
- Anahtar sızıntısı şüphesi varsa panelden hemen rotate edin.

## Manuel İçerik Ekleme

Wikipedia'dan manuel olarak:
1. https://tr.wikipedia.org/wiki/Balıklıgöl
2. İçeriği kopyala
3. Markdown formatına çevir
4. `src/content/places/` klasörüne kaydet
