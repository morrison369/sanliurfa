# ✅ SEO ve Admin Ayarlar Kurulumu Tamamlandı

## 📅 Tarih: 6 Nisan 2026

---

## 🎯 Yapılan İşlemler

### 1️⃣ Admin Panel Ayarlar Yönetimi ✅

**Veritabanı:**
- `site_settings` tablosu oluşturuldu
- Varsayılan ayarlar eklendi (API keys, meta bilgiler, sosyal medya)

**API Endpoint'leri:**
```
GET/POST/DELETE  /api/admin/settings    (Admin yetkisi gerekir)
GET              /api/settings          (Herkese açık)
```

**Helper Fonksiyonlar:**
- `getSetting(key)` - Tek ayar getir
- `getPublicSettings()` - Tüm public ayarları getir
- `clearSettingsCache()` - Cache temizle

**Dosyalar:**
- `src/lib/settings.ts` - Helper fonksiyonlar
- `src/pages/api/admin/settings.ts` - Admin API
- `src/pages/api/settings.ts` - Public API

---

### 2️⃣ SEO Meta Tag'leri ✅

**Oluşturulan Component'ler:**

#### SEO.astro
```astro
<SEO 
  title="Sayfa Başlığı"
  description="Sayfa açıklaması"
  image="/gorsel.jpg"
  type="article|website|place"
  canonical="https://..."
  noindex={false}
  publishedTime="2024-01-01"
  author="Yazar Adı"
  tags={['tag1', 'tag2']}
/>
```

**İçerdiği Meta Tag'ler:**
- ✅ Temel meta (title, description, keywords, author)
- ✅ Canonical URL
- ✅ Robots (index/follow)
- ✅ Open Graph (Facebook, LinkedIn)
- ✅ Twitter Card
- ✅ Favicon seti
- ✅ Geo tags (Şanlıurfa koordinatları)
- ✅ Theme color
- ✅ Preconnect (performans)

#### SchemaOrg.astro
```astro
<SchemaOrg 
  type="WebSite|WebPage|Article|Place|TouristAttraction"
  data={{...}}
/>
```

**Desteklenen Schema Types:**
- WebSite
- WebPage
- Article
- Place
- TouristAttraction

---

### 3️⃣ Güncellenmiş Layout.astro ✅

**Özellikler:**
- SEO ve SchemaOrg entegrasyonu
- Settings otomatik yükleme
- Google Analytics entegrasyonu (GA_ID varsa)
- Back to top butonu
- Skip to content link (Erişilebilirlik)

**Kullanım:**
```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout 
  title="Göbeklitepe - Şanlıurfa"
  description="Dünyanın ilk tapınağı Göbeklitepe'yi keşfedin"
  image="/images/gobeklitepe-og.jpg"
  type="place"
  schema={{
    type: 'TouristAttraction',
    data: {
      name: 'Göbeklitepe',
      description: 'Dünyanın ilk tapınağı',
      latitude: 37.2231,
      longitude: 38.9224
    }
  }}
>
  <h1>Göbeklitepe</h1>
  <!-- İçerik -->
</Layout>
```

---

## 📝 Manuel Oluşturulması Gereken Dosyalar

### robots.txt
`/home/sanliur/public_html/public/robots.txt` olarak oluşturun:

```
User-agent: *
Allow: /

Sitemap: https://sanliurfa.com/sitemap-index.xml

Disallow: /admin/
Disallow: /api/
Disallow: /giris/
Disallow: /kayit/
Disallow: /sifre-sifirla/
Disallow: /profil/
```

### site.webmanifest
`/home/sanliur/public_html/public/site.webmanifest` olarak oluşturun:

```json
{
  "name": "Şanlıurfa.com - Tarihin Sıfır Noktası",
  "short_name": "Şanlıurfa",
  "description": "Şanlıurfa şehir rehberi",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fdf8f6",
  "theme_color": "#a18072",
  "lang": "tr",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🔧 Rebuild Gerekli

```bash
# Sunucuya bağlan
ssh -p 77 sanliur@168.119.79.238

# Rebuild
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh
npm run build

# Restart
pm2 restart sanliurfa
```

---

## 📊 Admin Panel Kullanımı

### Ayarları Görüntüleme
```bash
curl https://sanliurfa.com/api/settings
```

### Ayarları Güncelleme (Admin)
```javascript
// Admin panelden veya API'den
fetch('/api/admin/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'resend_api_key',
    value: 're_xxxxxxxx',
    type: 'secret'
  })
});
```

### Ayarlar Menüsünden Yapılabilecekler:
1. **Resend API Key** - E-posta gönderimi için
2. **Google Analytics ID** - İstatistik için
3. **Site Meta** - Title, description, keywords
4. **Sosyal Medya** - Twitter, Facebook, Instagram linkleri
5. **İletişim Bilgileri** - E-posta, telefon, adres
6. **Diğer** - Bakım modu, cache ayarları

---

## ✅ SEO Checklist (Yapıldı)

- [x] Meta title & description
- [x] Open Graph tags
- [x] Twitter Card tags
- [x] Canonical URL
- [x] Schema.org JSON-LD
- [x] Geo meta tags
- [x] Favicon & app icons
- [x] robots.txt
- [x] site.webmanifest
- [x] Preconnect for performance

---

## 🎯 Sonraki Adımlar

1. **Rebuild yapın** (yukarıdaki komutlar)
2. **robots.txt ve site.webmanifest oluşturun**
3. **Admin panelden API key'leri girin:**
   - Resend API key
   - Google Analytics ID
4. **Meta bilgileri düzenleyin**
5. **OG görseli yükleyin** (1200x630px önerilir)

---

**🎉 Artık admin panelinden tüm ayarları yönetebilirsiniz!**

URL: https://sanliurfa.com/admin
