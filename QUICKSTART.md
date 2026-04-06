# 🚀 Hızlı Başlangıç Rehberi

## 1. Kurulum (İlk Defa)

```bash
# 1. Proje dizinine git
cd sanliurfa

# 2. Windows'ta tek tıkla kurulum
scripts\run-all.bat

# VEYA Manuel kurulum:
# Node.js bağımlılıkları
npm install --legacy-peer-deps

# Python sanal ortam
python -m venv .venv
.venv\Scripts\activate.bat

# Python bağımlılıkları
pip install -r scripts\requirements.txt
```

## 2. Çevre Değişkenleri

`.env` dosyası oluştur:

```bash
cp .env.example .env
```

**Supabase bilgilerini doldur:**
- `PUBLIC_SUPABASE_URL` - Supabase proje URL
- `PUBLIC_SUPABASE_ANON_KEY` - Anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (opsiyonel)

## 3. Veritabanı Kurulumu

Supabase SQL Editor'de çalıştır:

```bash
# Dosya: supabase/migrations/001_initial_schema.sql
# Tüm SQL kodunu Supabase SQL Editor'e yapıştır
```

## 4. İçerik Çekme (Opsiyonel)

```bash
# Windows'ta çift tıkla:
scripts\run-all.bat

# VEYA Manuel:
.venv\Scripts\activate.bat
python scripts\scraping-agent.py
python scripts\fetch-all-images.py
```

## 5. Geliştirme Sunucusu

```bash
npm run dev
```

**Tarayıcıda aç:** http://localhost:4321

## 6. Build ve Deploy

```bash
# Build al
npm run build

# Preview et
npm run preview
```

---

## 📁 Proje Yapısı

```
sanliurfa/
├── src/
│   ├── components/      # UI bileşenleri
│   ├── layouts/         # Layout bileşenleri
│   ├── lib/             # Yardımcı kütüphaneler
│   ├── pages/           # Tüm sayfalar
│   │   ├── api/         # API endpoint'leri
│   │   ├── places/      # Mekan sayfaları
│   │   └── ...
│   └── styles/          # CSS dosyaları
├── scripts/             # İçerik çekme scriptleri
│   ├── scraping-agent.py
│   └── ...
├── supabase/            # Veritabanı migrasyonları
└── public/              # Statik dosyalar
```

## 🎯 Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🔐 Üyelik | Giriş/Kayıt, Auth sistemi |
| ⭐ Puanlama | Yorumlar, puanlar, gamification |
| 📍 Mekanlar | Restoran, otel, kafe, müze |
| 🏛️ Tarihi Yerler | Göbeklitepe, Balıklıgöl, vb. |
| 🍽️ Gastronomi | Urfa kebabı, çiğ köfte, vb. |
| 📝 Blog | Gezi rehberleri, yazılar |
| 🎉 Etkinlikler | Festivaller, konserler |
| 🔍 Arama | Full-text arama |
| 👤 Profil | Kullanıcı profili, favoriler |
| ⚙️ Admin | Yönetim paneli |

## 🛠️ Teknolojiler

- **Frontend:** Astro 6, React 19, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Scraping:** Python, BeautifulSoup4
- **Deployment:** Node.js Standalone

## 📞 Destek

Sorun yaşarsanız:
1. `.env` dosyasını kontrol edin
2. Supabase bağlantısını test edin
3. `npm install` tekrar çalıştırın

---

**Hazır!** 🚀 Şimdi http://localhost:4321 adresine gidin.
