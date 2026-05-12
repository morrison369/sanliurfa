# 🚀 Port 1111 Kullanım Kılavuzu

## ⚡ Hızlı Başlatma

### Windows'ta Çift Tıkla:
```
start-1111.bat  ← Çift tıklayın
```

### Komut Satırı:
```bash
# NPM Script ile
npm run dev:1111

# Veya doğrudan
npx astro dev --port 1111
```

## 🔧 Yapılandırma

Astro config (`astro.config.mjs`) şu ayarlarla sabitlendi:

```javascript
export default defineConfig({
  server: {
    port: 1111,
    host: true  // Tüm ağ arayüzlerinde dinler
  },
  preview: {
    port: 1111,
    host: true
  },
  // ... diğer ayarlar
});
```

## 🌐 Erişim URL'leri

| URL | Açıklama |
|-----|----------|
| http://localhost:1111 | Yerel erişim |
| http://127.0.0.1:1111 | IP üzerinden |
| http://[ Bilgisayar-IP]:1111 | Ağ üzerinden erişim |

## 📝 NPM Script'leri

```bash
# Geliştirme sunucusu (1111 portu)
npm run dev:1111

# Preview (1111 portu)  
npm run preview:1111

# Alternatif
npm run start:1111
```

## ⚠️ Port Değiştirme

Eğer 1111 portu doluysa, geçici olarak başka port kullanabilirsiniz:

```bash
# Örnek: 3000 portunda çalıştır
npx astro dev --port 3000
```

## 🔍 Port Kontrolü

Port 1111'in kullanımda olup olmadığını kontrol etmek için:

### Windows:
```cmd
netstat -ano | findstr :1111
```

### Portu Serbest Bırakma (Windows):
```cmd
# PID'yi bul
netstat -ano | findstr :1111

# PID'yi sonlandır (örnek: PID 1234)
taskkill /PID 1234 /F
```

---

**Site hazır!** → http://localhost:1111
