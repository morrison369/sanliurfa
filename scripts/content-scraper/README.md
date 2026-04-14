# Content Scraper for Şanlıurfa

İçerik ve resim çekme araçları.

## Kullanım

### 1. Wikipedia'dan İçerik Çekme

```bash
npx tsx scripts/content-scraper/wikipedia-scraper.ts
```

### 2. Ücretsiz Resim İndirme

```bash
# Unsplash API key gerekli
export UNSPLASH_ACCESS_KEY=your_key_here
npx tsx scripts/content-scraper/image-downloader.ts
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

### Pexels (Opsiyonel)
1. https://www.pexels.com/api/ adresine git
2. API key başvurusu yap

## Ücretsiz Resim Kaynakları

- **Unsplash**: https://unsplash.com (API ile)
- **Pexels**: https://pexels.com (API ile)
- **Pixabay**: https://pixabay.com
- **Wikimedia Commons**: https://commons.wikimedia.org

## Manuel İçerik Ekleme

Wikipedia'dan manuel olarak:
1. https://tr.wikipedia.org/wiki/Balıklıgöl
2. İçeriği kopyala
3. Markdown formatına çevir
4. `src/content/places/` klasörüne kaydet
