# CWP Panel Domain ve SSL Kurulum Rehberi

## 🚨 DNS Durumu

**Mevcut DNS:**
- `sanliurfa.com` → Cloudflare (172.67.153.245, 104.21.12.251) ❌
- **Hedef:** `sanliurfa.com` → 168.119.79.238 ✅

---

## 📋 Adım 1: DNS Güncelleme (Cloudflare)

1. **Cloudflare Panel**'e giriş yap: https://dash.cloudflare.com
2. **sanliurfa.com** domainini seç
3. **DNS** sekmesine git
4. **A kaydını** bul ve düzenle:
   ```
   Type: A
   Name: @ (veya sanliurfa.com)
   IPv4 address: 168.119.79.238
   Proxy status: DNS only (gri bulut) ⚠️ ÖNEMLİ!
   TTL: Auto
   ```
5. **Kaydet**

⚠️ **Proxy (turuncu bulut) KAPALI olmalı!** Aksi halde CWP SSL alamaz.

---

## 📋 Adım 2: CWP Panel Domain Ekleme

1. **CWP Panel**'e giriş: https://168.119.79.238:2083
   - Kullanıcı: `sanliur`
   - Şifre: `CHANGE_ME_CWP_SSH_PASSWORD`

2. **Sol Menü** → `Domains` → `Add Domain`

3. **Formu doldur:**
   ```
   Domain: sanliurfa.com
   Document Root: /home/sanliur/public_html
   PHP Version: PHP 8.2 (veya mevcut)
   ```

4. **Create** butonuna tıkla

---

## 📋 Adım 3: AutoSSL (Let's Encrypt)

1. **CWP Panel** → `Webserver Settings` → `SSL Certificates` → `AutoSSL`

2. **Alanları doldur:**
   ```
   User: sanliur
   Domain: sanliurfa.com
   ```

3. **Issue Certificate** butonuna tıkla

4. **Sonuç:**
   - ✅ Sertifika başarıyla oluşturuldu
   - HTTPS aktif olur

---

## 📋 Adım 4: Apache Proxy Ayarı (CWP)

1. **CWP Panel** → `Webserver Settings` → `Webserver Domain Conf`

2. **Seç:**
   ```
   User: sanliur
   Domain: sanliurfa.com
   ```

3. **Configuration:**
   ```
   Webserver: Apache
   Proxy: Custom Port
   Port: 6000
   IP: 127.0.0.1
   ```

4. **Rebuild webserver conf for domain on save** ✅ İşaretle

5. **Save Changes**

---

## 📋 Adım 5: WWW Yönlendirme (Opsiyonel)

`www.sanliurfa.com` → `sanliurfa.com` yönlendirme:

1. **CWP Panel** → `Domains` → `sanliurfa.com` (düzenle)

2. **Aliases** ekle:
   ```
   www.sanliurfa.com
   ```

3. **Save**

---

## ✅ Test

DNS güncellemesi 5-60 dakika sürebilir. Test için:

```bash
# Local terminalden
dig sanliurfa.com
# veya
nslookup sanliurfa.com

# Sonuç: 168.119.79.238 göstermeli
```

Tarayıcıda:
- http://sanliurfa.com ✅
- https://sanliurfa.com ✅ (SSL ile)

---

## 🔧 Sorun Giderme

### SSL Hatası
```
CWP Panel → Service Management → Apache → Restart
```

### DNS Propagation Kontrol
https://www.whatsmydns.net/#A/sanliurfa.com

### Proxy Hatası
`.htaccess` dosyası zaten mevcut:
```
/home/sanliur/public_html/.htaccess
```

---

## 🎉 Tamamlandığında

| URL | Durum |
|-----|-------|
| http://sanliurfa.com | ✅ 80 → 6000 |
| https://sanliurfa.com | ✅ 443 → 6000 + SSL |
| http://168.119.79.238 | ✅ (IP üzerinden) |

**Port 6000:** Sadece localhost (güvenli)
**Port 80/443:** Herkese açık
