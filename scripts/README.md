# Şanlıurfa.com İçerik Çekme Scriptleri

Bu klasör, Şanlıurfa.com için otomatik içerik çekme scriptlerini içerir. **API kullanmadan** çalışır, tamamen ücretsizdir.

## 📁 Scriptler

| Script | Açıklama | Çalışma Şekli |
|--------|----------|---------------|
| `scraping-agent.py` | Ana içerik çekme agent'ı | Wikipedia + DuckDuckGo |
| `fetch-all-images.py` | Görsel çekme agent'ı | Wikimedia + Commons + DuckDuckGo |
| `import-to-supabase.py` | Supabase'e aktarım | SQL/Python |
| `run-all.bat` | Tüm işlemleri otomatik çalıştır | Windows Batch |

## 🚀 Hızlı Başlangıç

### Windows'ta Tek Tıkla Çalıştırma:

```bash
# 1. scripts klasörüne gir
cd scripts

# 2. Sadece çift tıkla:
run-all.bat
```

### Manuel Çalıştırma:

```bash
# 1. Sanal ortam oluştur (ilk sefer)
python -m venv .venv

# 2. Sanal ortamı aktifleştir
.venv\Scripts\activate.bat

# 3. Bağımlılıkları yükle
pip install -r requirements.txt

# 4. İçerikleri çek
python scripts/scraping-agent.py

# 5. Görselleri çek
python scripts/fetch-all-images.py

# 6. Supabase'e aktar (opsiyonel)
python scripts/import-to-supabase.py
```

## 📊 Çekilen Veriler

### Kategoriler (kategoriler.txt'den)

1. **Tarihi Yerler** (8 mekan)
   - Göbeklitepe
   - Balıklıgöl
   - Harran
   - Halfeti
   - Şanlıurfa Kalesi
   - Rızvaniye Camii
   - Mevlid-i Halil Camii
   - Eyyüp Peygamber Makamı

2. **Restoranlar** (4 mekan)
   - Ciğerci Aziz
   - Meşhur Çiğköfteci
   - Zahter Kahvaltı
   - Cevahir Konak

3. **Oteller** (3 mekan)
   - Hotel Manço
   - El Ruha Hotel
   - Nevali Hotel

4. **Gastronomi** (3 yemek)
   - Urfa Kebabı
   - Çiğ Köfte
   - Şıllık Tatlısı

## 🔧 Veri Kaynakları

### 1. Wikipedia (tr.wikipedia.org)
- Makale içerikleri
- Koordinatlar (enlem/boylam)
- Açıklamalar
- Infobox verileri

### 2. Wikimedia Commons
- Yüksek çözünürlüklü görseller
- Tarihi fotoğraflar
- Public domain/CC lisanslı içerikler

### 3. DuckDuckGo
- Arama sonuçları
- Alternatif bilgiler
- Görsel arama

## 📁 Çıktı Yapısı

```
scripts/
├── data/
│   ├── tarihi_yerler.json      # Tarihi yerler verisi
│   ├── restoranlar.json        # Restoranlar verisi
│   ├── oteller.json            # Oteller verisi
│   ├── gastronomi.json         # Yemekler verisi
│   ├── supabase_inserts.sql    # SQL insert ifadeleri
│   └── image_mapping.json      # Görsel eşleştirmeleri
└── images/                     # İndirilen görseller

public/images/
├── historical/                 # Tarihi yer görselleri
│   ├── gobeklitepe.jpg
│   ├── balikligol.jpg
│   └── ...
├── places/                     # Mekan görselleri
│   └── ...
└── foods/                      # Yemek görselleri
    └── ...
```

## ⚙️ JSON Veri Yapısı

### Tarihi Yer Örneği:

```json
{
  "id": "uuid...",
  "slug": "gobeklitepe",
  "name": "Göbeklitepe",
  "category": "tarihi_yerler",
  "wikipedia": {
    "title": "Göbeklitepe",
    "content": "Dünyanın bilinen en eski tapınak kompleksi...",
    "url": "https://tr.wikipedia.org/wiki/G%C3%B6beklitepe",
    "coordinates": {
      "lat": 37.2231,
      "lon": 38.9223
    },
    "image": "https://..."
  },
  "generated_description": "Göbeklitepe, Şanlıurfa'nın en popüler mekanlarından...",
  "coordinates": {
    "lat": 37.2231,
    "lon": 38.9223
  },
  "fetched_at": "2025-01-01T12:00:00"
}
```

## 🎯 Özelleştirme

### Yeni Kategori Ekleme:

`scraping-agent.py` içinde `self.search_queries` sözlüğüne ekleme yapın:

```python
'shoping': [
    {'name': 'Bakırcılar Çarşısı', 'slug': 'bakircilar', 'search': 'Bakırcılar Çarşısı Şanlıurfa'},
]
```

### Yeni Görsel Kaynağı:

`fetch-all-images.py` içinde `fetch_image_for_place` metoduna yeni kaynak ekle:

```python
def get_new_source_image(self, search_term: str) -> str:
    # Yeni kaynak kodu
    pass
```

## ⚠️ Önemli Notlar

1. **Rate Limiting**: Scriptler arasında bekleme süreleri vardır (0.3-1 saniye)
2. **Robots.txt**: Wikipedia ve diğer sitelerin robots.txt kurallarına uyulur
3. **User-Agent**: Gerçekçi User-Agent kullanılır
4. **Placeholder**: Görsel bulunamazsa otomatik placeholder oluşturulur

## 🔒 Lisans Uyumluluğu

- **Wikipedia**: CC BY-SA lisanslı, atıf gerektirir
- **Wikimedia Commons**: Çeşitli açık lisanslar
- **Placeholder**: MIT lisanslı (placehold.co)

## 🐛 Hata Ayıklama

### Sık Karşılaşılan Hatalar:

**1. "Python bulunamadı"**
```bash
# Çözüm: Python'u kurun
https://python.org/downloads
```

**2. "Module not found"**
```bash
# Çözüm: Bağımlılıkları yeniden yükleyin
pip install -r requirements.txt
```

**3. "Connection timeout"**
```bash
# Çözüm: İnternet bağlantınızı kontrol edin
# Veya timeout sürelerini artırın (script içinden)
```

## 📞 Destek

Sorularınız için:
- GitHub Issues: [repo-url]/issues
- E-posta: info@sanliurfa.com

---

**Not:** Bu scriptler eğitim ve araştırma amaçlıdır. Ticari kullanımda veri kaynaklarının kullanım şartlarına uyun.
